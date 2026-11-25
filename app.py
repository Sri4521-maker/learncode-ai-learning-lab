"""Flask backend for LeArNCoDiNg. Set GOOGLE_CLIENT_ID before public deployment."""
from __future__ import annotations
import hashlib, json, os, random, re, secrets, sqlite3, time, urllib.parse, urllib.request, uuid
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory
from veritas_api import reply_to_veritas

ROOT=Path(__file__).resolve().parent
PUBLIC=ROOT/'public'
DB_PATH=Path(os.environ.get('LEARN_DATABASE', ROOT/'data'/'learncoding.sqlite'))
app=Flask(__name__, static_folder=None)
GROUP_BANK=json.loads((PUBLIC/'group-games.json').read_text())

BANKS={
 'foundations':[
 ('What is a prompt?',['A clear instruction for an AI tool','A computer screen','A password','A battery'],0,'A prompt tells an AI what you want it to do.'),
 ('Which statement about AI output is safest?',['It is always correct','Check it because it can be wrong','It cannot use words','It replaces teachers'],1,'AI can produce inaccurate information; verify important claims.'),
 ('What does HTML describe?',['Page structure and meaning','Internet speed','A mouse','Only colors'],0,'HTML structures webpage content.'),
 ('What is CSS used for?',['Styling a webpage','Storing passwords','Sending email','Charging a laptop'],0,'CSS controls appearance and layout.'),
 ('What does a browser do?',['Displays webpages','Builds hardware','Prints sites','Creates electricity'],0,'A browser requests and displays web resources.'),
 ('How can you improve an AI answer?',['Give specific context and review it','Hide the question','Assume it is perfect','Use no context'],0,'Specific instructions and review improve usefulness.'),
 ('What does JavaScript add?',['Interactive behavior','Paper pages','A keyboard','Wi-Fi'],0,'JavaScript responds to actions and updates pages.'),
 ('Before sharing private information with AI, you should:',['Check rules and avoid sensitive details','Share everything','Post it publicly','Use a friend’s password'],0,'Protect personal information and follow tool rules.')],
 'advanced':[
 ('Why review generated code?',['It can contain bugs or security issues','It is always encrypted','Review slows computers','Code cannot be tested'],0,'Generated code can be plausible but incorrect.'),
 ('How compare two AI tools?',['Same task and criteria, then verify','Choose shortest name','Trust fastest','Compare colors'],0,'Consistent criteria make comparisons meaningful.'),
 ('What is semantic HTML for?',['Communicating structure and meaning','Encrypting rows','Replacing CSS','Running servers'],0,'Semantic elements describe content purpose.'),
 ('Why validate on the server too?',['Clients can bypass browser checks','Servers cannot receive text','CSS requires it','It exposes passwords'],0,'Client validation is under user control.'),
 ('Parameterized SQL helps prevent:',['SQL injection','Slow typing','Network outages','CSS conflicts'],0,'Bound values are kept separate from SQL syntax.'),
 ('An automated test can:',['Check expected behavior repeatedly','Prove no bugs exist','Replace all review','Make sites accessible'],0,'Tests catch regressions for the cases they cover.'),
 ('What helps keyboard accessibility?',['Visible focus and logical tab order','Removing labels','Color alone','Disabling keyboard'],0,'Focus and predictable order help keyboard users.'),
 ('How verify an AI factual claim?',['Check reliable sources or run a test','Repeat it unverified','Trust confident tone','Remove context'],0,'Fluency does not prove accuracy.')]
}

def database():
 DB_PATH.parent.mkdir(parents=True,exist_ok=True)
 conn=sqlite3.connect(DB_PATH); conn.row_factory=sqlite3.Row; conn.execute('PRAGMA foreign_keys=ON')
 conn.executescript((ROOT/'schema.sql').read_text())
 return conn

def identity():
 token=request.headers.get('Authorization','')
 if not token.startswith('Bearer '): return None
 supabase_url=os.environ.get('SUPABASE_URL','').rstrip('/'); supabase_key=os.environ.get('SUPABASE_ANON_KEY','')
 if supabase_url and supabase_key:
  try:
   req=urllib.request.Request(supabase_url+'/auth/v1/user',headers={'apikey':supabase_key,'Authorization':token})
   with urllib.request.urlopen(req,timeout=8) as res: user=json.loads(res.read())
   if user.get('id') and user.get('email') and user.get('email_confirmed_at'):
    return {'sub':user['id'],'email':user['email'],'name':user.get('user_metadata',{}).get('display_name') or user.get('email','').split('@')[0] or 'Learner','email_verified':True}
  except Exception: pass
 client=os.environ.get('GOOGLE_CLIENT_ID','')
 if not client: return None
 try:
  url='https://oauth2.googleapis.com/tokeninfo?'+urllib.parse.urlencode({'id_token':token[7:].strip()})
  with urllib.request.urlopen(url,timeout=8) as res: claims=json.loads(res.read())
  if claims.get('aud')!=client or claims.get('iss') not in ('accounts.google.com','https://accounts.google.com') or claims.get('email_verified') not in (True,'true') or int(claims.get('exp',0))<=int(time.time()): return None
  return claims
 except Exception: return None

def require_identity():
 who=identity()
 return (who,None) if who else (None,(jsonify(success=False,message='Sign in with Google to continue.'),401))

PARTY_CODE_CHARS='ABCDEFGHJKMNPQRSTUVWXYZ23456789'
PARTY_SAFE_NAME=re.compile(r'^[A-Za-z0-9][A-Za-z0-9 _-]{0,15}$')
PARTY_PRIVATE=re.compile(r'https?://|www\.|\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b|(?:^|\D)(?:\+?\d[\d ().-]{7,}\d)(?:\D|$)|\b(?:my password is|my address is|my phone is)\b',re.I)

def party_now(): return int(time.time())
def party_hash(value): return hashlib.sha256(value.encode()).hexdigest()
def party_name(value): return isinstance(value,str) and bool(PARTY_SAFE_NAME.fullmatch(value.strip()))
def party_cleanup(con,now):
 con.execute('DELETE FROM party_rooms WHERE updated_at < ?',(now-4*60*60,))
 con.execute('DELETE FROM party_messages WHERE created_at < ?',(now-60*60,))
 con.execute('DELETE FROM party_players WHERE last_seen < ?',(now-10*60,))
 con.commit()
def party_code(con):
 for _ in range(12):
  code=''.join(secrets.choice(PARTY_CODE_CHARS) for _ in range(6))
  if not con.execute('SELECT code FROM party_rooms WHERE code=?',(code,)).fetchone(): return code
 raise RuntimeError('Could not create a room code.')
def party_player(con,code):
 token=request.headers.get('X-Party-Session','')
 if not token or not re.fullmatch(r'[A-Z0-9]{6}',code): return None
 return con.execute('SELECT * FROM party_players WHERE room_code=? AND token_hash=?',(code,party_hash(token))).fetchone()
def party_advance(con,room,now):
 try: game=json.loads(room['game_json'] or '{}')
 except Exception: return room
 if game.get('phase')=='playing':
  active=con.execute('SELECT id FROM party_players WHERE room_code=? AND last_seen>=?',(room['code'],now-45)).fetchall()
  answers=game.get('answers',{})
  if now>=int(game.get('deadline',0)) or (active and all(p['id'] in answers for p in active)):
   game['phase']='reveal'; game['reveal_until']=now+4
 elif game.get('phase')=='reveal' and now>=int(game.get('reveal_until',0)):
  next_round=int(game.get('round',0))+1
  if next_round>=len(game.get('order',[])):
   game['phase']='complete'
   top=con.execute('SELECT id,nickname,score FROM party_players WHERE room_code=? ORDER BY score DESC,joined_at,id LIMIT 1',(room['code'],)).fetchone()
   game['winner']={'id':top['id'],'nickname':top['nickname'],'score':top['score']} if top else None
  else:
   game['round']=next_round; game['phase']='playing'; game['answers']={}; game['deadline']=now+25; game['reveal_until']=0
 encoded=json.dumps(game)
 con.execute('UPDATE party_rooms SET game_json=?,updated_at=? WHERE code=?',(encoded,now,room['code'])); con.commit()
 return {**dict(room),'game_json':encoded,'updated_at':now}
def party_public_room(con,room,player,now):
 rows=con.execute('SELECT id,nickname,score,last_seen,joined_at FROM party_players WHERE room_code=? ORDER BY joined_at,id',(room['code'],)).fetchall()
 active=[p for p in rows if p['last_seen']>=now-45]
 try: stored=json.loads(room['game_json'] or '{}')
 except Exception: stored={}
 mode=GROUP_BANK.get(stored.get('mode')); game=None
 if stored.get('phase')=='complete':
  game={'mode':stored.get('mode'),'title':mode['title'] if mode else 'Quiz Party','round':len(stored.get('order',[])),'total':len(stored.get('order',[])),'phase':'complete','deadline':0,'question':None,'answered':0,'playersAnswered':{},'hasAnswered':True,'correctAnswer':None,'winner':stored.get('winner')}
 elif mode and isinstance(stored.get('round'),int) and stored['round']<len(stored.get('order',[])):
  q=mode['questions'][stored['order'][stored['round']]]; reveal=stored.get('phase')!='playing'
  question={'topic':q['topic'],'question':q['question'],'options':q['options']}
  if reveal: question.update(answer=q['answer'],why=q['why'])
  answers=stored.get('answers',{})
  game={'mode':stored['mode'],'title':mode['title'],'round':stored['round']+1,'total':len(stored['order']),'phase':stored['phase'],'deadline':stored.get('deadline',0),'revealUntil':stored.get('reveal_until',0),'question':question,'answered':len(answers),'playersAnswered':answers if reveal else {pid:True for pid in answers},'hasAnswered':player['id'] in answers,'correctAnswer':q['answer'] if reveal else None,'winner':stored.get('winner')}
 cursor=con.execute('SELECT COALESCE(MAX(id),0) AS id FROM party_messages WHERE room_code=?',(room['code'],)).fetchone()['id']
 return {'code':room['code'],'host':room['host_player_id'],'me':player['id'],'players':[{'id':p['id'],'nickname':p['nickname'],'score':p['score'],'online':True} for p in active],'game':game,'now':now,'messagesCursor':cursor}

@app.post('/api/party/rooms')
def party_create():
 who,error=require_identity()
 if error:return error
 body=request.get_json(silent=True) or {}; nickname=body.get('nickname','')
 if not party_name(nickname):return jsonify(success=False,message='Choose a 1–16 character nickname using letters, numbers, spaces, or dashes.'),400
 now=party_now(); con=database()
 try:
  party_cleanup(con,now); con.execute('BEGIN IMMEDIATE')
  code=party_code(con); player_id=str(uuid.uuid4()); token=secrets.token_urlsafe(32)
  con.execute('INSERT INTO party_rooms(code,host_player_id,game_json,created_at,updated_at) VALUES(?,?,?,?,?)',(code,player_id,'{}',now,now))
  con.execute('INSERT INTO party_players(id,room_code,token_hash,nickname,score,joined_at,last_seen) VALUES(?,?,?,?,0,?,?)',(player_id,code,party_hash(token),nickname.strip(),now,now));con.commit()
  room=con.execute('SELECT * FROM party_rooms WHERE code=?',(code,)).fetchone();player=con.execute('SELECT * FROM party_players WHERE id=?',(player_id,)).fetchone()
  return jsonify(success=True,token=token,state=party_public_room(con,room,player,now)),201
 except Exception:con.rollback();return jsonify(success=False,message='Could not create a game room right now.'),503
 finally:con.close()

@app.post('/api/party/rooms/<code>/join')
def party_join(code):
 who,error=require_identity()
 if error:return error
 code=code.upper();body=request.get_json(silent=True) or {};nickname=body.get('nickname','')
 if not re.fullmatch(r'[A-Z0-9]{6}',code):return jsonify(success=False,message='Enter the six-character room code.'),400
 if not party_name(nickname):return jsonify(success=False,message='Choose a 1–16 character nickname using letters, numbers, spaces, or dashes.'),400
 now=party_now();con=database()
 try:
  party_cleanup(con,now);room=con.execute('SELECT * FROM party_rooms WHERE code=?',(code,)).fetchone()
  if not room:return jsonify(success=False,message='That room code has expired or is incorrect.'),404
  count=con.execute('SELECT COUNT(*) AS count FROM party_players WHERE room_code=?',(code,)).fetchone()['count']
  if count>=8:return jsonify(success=False,message='This room is full. Ask the host for another code.'),409
  player_id=str(uuid.uuid4());token=secrets.token_urlsafe(32)
  con.execute('INSERT INTO party_players(id,room_code,token_hash,nickname,score,joined_at,last_seen) VALUES(?,?,?,?,0,?,?)',(player_id,code,party_hash(token),nickname.strip(),now,now));con.commit()
  if not con.execute('SELECT id FROM party_players WHERE room_code=? AND id=?',(code,room['host_player_id'])).fetchone(): con.execute('UPDATE party_rooms SET host_player_id=?,updated_at=? WHERE code=?',(player_id,now,code));con.commit()
  player=con.execute('SELECT * FROM party_players WHERE id=?',(player_id,)).fetchone()
  return jsonify(success=True,token=token,state=party_public_room(con,room,player,now)),201
 except Exception:return jsonify(success=False,message='Could not join that room right now.'),503
 finally:con.close()

@app.get('/api/party/rooms/<code>')
def party_poll(code):
 code=code.upper();now=party_now();con=database()
 try:
  party_cleanup(con,now);player=party_player(con,code)
  room=con.execute('SELECT * FROM party_rooms WHERE code=?',(code,)).fetchone()
  if not room or not player:return jsonify(success=False,message='Your room session expired. Rejoin with the room code.'),401
  con.execute('UPDATE party_players SET last_seen=? WHERE id=?',(now,player['id']));con.commit()
  room=party_advance(con,con.execute('SELECT * FROM party_rooms WHERE code=?',(code,)).fetchone(),now)
  player=con.execute('SELECT * FROM party_players WHERE id=?',(player['id'],)).fetchone();state=party_public_room(con,room,player,now)
  try:since=max(0,int(request.args.get('since',0)))
  except ValueError:since=0
  state['messages']=[dict(m) for m in con.execute('SELECT id,player_id,nickname,body,created_at FROM party_messages WHERE room_code=? AND id>? ORDER BY id LIMIT 60',(code,since)).fetchall()]
  return jsonify(success=True,state=state)
 finally:con.close()

@app.post('/api/party/rooms/<code>/messages')
def party_message(code):
 code=code.upper();now=party_now();con=database()
 try:
  player=party_player(con,code);room=con.execute('SELECT code FROM party_rooms WHERE code=?',(code,)).fetchone()
  if not player or not room:return jsonify(success=False,message='Your room session expired. Rejoin with the room code.'),401
  body=request.get_json(silent=True) or {};message=re.sub(r'[\x00-\x1f\x7f]','',body.get('message','').strip()) if isinstance(body.get('message'),str) else ''
  if not message or len(message)>180:return jsonify(success=False,message='Write 1–180 characters.'),400
  if PARTY_PRIVATE.search(message):return jsonify(success=False,message='Keep private details and links out of game chat. Try a nickname or a game idea instead.'),400
  if now-player['last_message_at']<2:return jsonify(success=False,message='Wait a moment before sending another message.'),429
  con.execute('INSERT INTO party_messages(room_code,player_id,nickname,body,created_at) VALUES(?,?,?,?,?)',(code,player['id'],player['nickname'],message,now))
  con.execute('UPDATE party_players SET last_message_at=?,last_seen=? WHERE id=?',(now,now,player['id']))
  con.execute('UPDATE party_rooms SET updated_at=? WHERE code=?',(now,code));con.commit()
  return jsonify(success=True),201
 finally:con.close()

@app.post('/api/party/rooms/<code>/start')
def party_start(code):
 who,error=require_identity()
 if error:return error
 code=code.upper();now=party_now();con=database()
 try:
  player=party_player(con,code);room=con.execute('SELECT * FROM party_rooms WHERE code=?',(code,)).fetchone()
  if not player or not room:return jsonify(success=False,message='Your room session expired. Rejoin with the room code.'),401
  if room['host_player_id']!=player['id']:return jsonify(success=False,message='Only the host can start the next game.'),403
  body=request.get_json(silent=True) or {};mode=GROUP_BANK.get(body.get('mode'))
  if not mode:return jsonify(success=False,message='Choose one of the listed mini-games.'),400
  active=con.execute('SELECT id FROM party_players WHERE room_code=? AND last_seen>=?',(code,now-45)).fetchall()
  if len(active)<2:return jsonify(success=False,message='Invite at least one friend before starting.'),409
  order=list(range(len(mode['questions'])));random.shuffle(order);game={'mode':body['mode'],'order':order,'round':0,'phase':'playing','deadline':now+25,'reveal_until':0,'answers':{}}
  con.execute('UPDATE party_players SET score=0 WHERE room_code=?',(code,));con.execute('UPDATE party_rooms SET game_json=?,updated_at=? WHERE code=?',(json.dumps(game),now,code));con.commit()
  room=con.execute('SELECT * FROM party_rooms WHERE code=?',(code,)).fetchone();return jsonify(success=True,state=party_public_room(con,room,player,now))
 except Exception:con.rollback();return jsonify(success=False,message='Could not start the game. Try again.'),503
 finally:con.close()

@app.post('/api/party/rooms/<code>/answer')
def party_answer(code):
 code=code.upper();now=party_now();con=database()
 try:
  player=party_player(con,code);room=con.execute('SELECT * FROM party_rooms WHERE code=?',(code,)).fetchone()
  if not player or not room:return jsonify(success=False,message='Your room session expired. Rejoin with the room code.'),401
  room=party_advance(con,room,now)
  try:game=json.loads(room['game_json'] or '{}')
  except Exception:game={}
  body=request.get_json(silent=True) or {};choice=body.get('choice')
  if game.get('phase')!='playing' or now>=int(game.get('deadline',0)) or not isinstance(choice,int) or not 0<=choice<=3:return jsonify(success=False,message='This round has closed. Wait for the next one.'),409
  if player['id'] in game.get('answers',{}):return jsonify(success=False,message='Your answer is already in.'),409
  question=GROUP_BANK.get(game.get('mode'),{}).get('questions',[])
  try:question=question[game['order'][game['round']]]
  except Exception:return jsonify(success=False,message='This game is no longer available.'),409
  correct=choice==question['answer'];points=100+max(0,int((game['deadline']-now)*4+0.999999)) if correct else 0
  game.setdefault('answers',{})[player['id']]={'choice':choice,'correct':correct,'points':points}
  con.execute('UPDATE party_players SET score=score+?,last_seen=? WHERE id=?',(points,now,player['id']));con.execute('UPDATE party_rooms SET game_json=?,updated_at=? WHERE code=?',(json.dumps(game),now,code));con.commit()
  return jsonify(success=True,points=points,correct=correct)
 finally:con.close()

@app.post('/api/party/rooms/<code>/leave')
def party_leave(code):
 code=code.upper();now=party_now();con=database()
 try:
  player=party_player(con,code);room=con.execute('SELECT * FROM party_rooms WHERE code=?',(code,)).fetchone()
  if not player or not room:return jsonify(success=True)
  con.execute('DELETE FROM party_players WHERE id=?',(player['id'],));remaining=con.execute('SELECT id FROM party_players WHERE room_code=? ORDER BY joined_at,id',(code,)).fetchall()
  if not remaining:con.execute('DELETE FROM party_rooms WHERE code=?',(code,))
  elif room['host_player_id']==player['id']:con.execute('UPDATE party_rooms SET host_player_id=?,updated_at=? WHERE code=?',(remaining[0]['id'],now,code))
  con.commit();return jsonify(success=True)
 finally:con.close()

@app.get('/')
def home(): return send_from_directory(PUBLIC,'index.html')
@app.get('/api/config')
def config(): return jsonify(google_client_id=os.environ.get('GOOGLE_CLIENT_ID',''),supabase_url=os.environ.get('SUPABASE_URL',''),supabase_anon_key=os.environ.get('SUPABASE_ANON_KEY',''))
@app.post('/api/auth/supabase')
def supabase_signin():
 body=request.get_json(silent=True) or {}; token=body.get('access_token','')
 if not token or not os.environ.get('SUPABASE_URL') or not os.environ.get('SUPABASE_ANON_KEY'):
  return jsonify(success=False,message='Supabase email sign-in is not configured.'),503
 try:
  req=urllib.request.Request(os.environ['SUPABASE_URL'].rstrip('/')+'/auth/v1/user',headers={'apikey':os.environ['SUPABASE_ANON_KEY'],'Authorization':'Bearer '+token})
  with urllib.request.urlopen(req,timeout=8) as res: user=json.loads(res.read())
  if not user.get('id') or not user.get('email') or not user.get('email_confirmed_at'): raise ValueError()
  profile={'sub':user['id'],'email':user['email'],'name':user.get('user_metadata',{}).get('display_name') or user['email'].split('@')[0] or 'Learner','email_verified':True}
  return jsonify(success=True,profile=profile)
 except Exception:return jsonify(success=False,message='Email sign-in could not be verified. Check your confirmation email and try again.'),401
@app.post('/api/auth/google')
def google_signin():
 body=request.get_json(silent=True) or {}; token=body.get('credential',''); client=os.environ.get('GOOGLE_CLIENT_ID','')
 if not token or not client: return jsonify(success=False,message='Google sign-in is not configured for this site yet.'),503
 try:
  url='https://oauth2.googleapis.com/tokeninfo?'+urllib.parse.urlencode({'id_token':token})
  with urllib.request.urlopen(url,timeout=8) as res: c=json.loads(res.read())
  if c.get('aud')!=client or c.get('iss') not in ('accounts.google.com','https://accounts.google.com') or c.get('email_verified') not in (True,'true') or int(c.get('exp',0))<=int(time.time()): raise ValueError()
  return jsonify(success=True,profile={'sub':c['sub'],'email':c.get('email'),'name':c.get('name') or c.get('given_name') or 'Learner','email_verified':True})
 except Exception: return jsonify(success=False,message='Google sign-in could not be verified. Check OAuth settings.'),401

@app.post('/api/submit')
def submit():
 who,error=require_identity()
 if error:return error
 b=request.get_json(silent=True) or {}; errors={}
 sid=str(b.get('student_id','')).strip().upper(); name=str(b.get('student_name','')).strip(); level=b.get('survey_level'); week=str(b.get('module_or_week','')).strip()
 if not re.fullmatch(r'[A-Z0-9-]+',sid):errors['student_id']='Enter letters, numbers, and hyphens only.'
 if len(name)<2:errors['student_name']='Enter at least 2 characters.'
 if level not in BANKS:errors['survey_level']='Choose a learning level.'
 if not week:errors['module_or_week']='Enter a module or week.'
 for f in ('ai_tools_used','web_dev_skills_used'):
  if not isinstance(b.get(f),list) or not b[f]:errors[f]='Select at least one option.'
 mins={'q1_what_each_ai_does':20,'q2_ai_comparison':20,'q3_web_dev_progress':20,'q4_daily_life_help':20,'q5_real_world_examples':25,'q7_biggest_challenge':5}
 for f,n in mins.items():
  if len(str(b.get(f,'')).strip())<n:errors[f]=f'Enter at least {n} characters.'
 rating=b.get('q6_confidence_rating')
 if not isinstance(rating,int) or not 1<=rating<=5:errors['q6_confidence_rating']='Choose 1 to 5.'
 answers=b.get('quiz_answers') or {}
 if not isinstance(answers,dict) or any(not isinstance(answers.get(f'q{i}'),int) or not 0<=answers[f'q{i}']<4 for i in range(1,9)):errors['quiz_answers']='Answer all eight questions.'
 if errors:return jsonify(success=False,errors=errors),400
 breakdown=[]
 for i,(q,opts,answer,explain) in enumerate(BANKS[level],1):
  pick=answers[f'q{i}']; breakdown.append({'id':f'q{i}','question':q,'userAnswer':opts[pick],'correctAnswer':opts[answer],'isCorrect':pick==answer,'explanation':explain})
 score=sum(x['isCorrect'] for x in breakdown); q5=b['q5_real_world_examples'].strip(); xp=50+20*score+(30 if len(q5)>=120 else 0)
 milestones=['Survey Completed']+(['Quiz Mastery'] if score>=7 else [])+(['Perfect Score'] if score==8 else [])
 try:
  con=database(); cur=con.execute('INSERT INTO survey_responses (student_id,student_name,survey_level,module_or_week,ai_tools_used,q1_what_each_ai_does,q2_ai_comparison,web_dev_skills_used,q3_web_dev_progress,q4_daily_life_help,q5_real_world_examples,q6_confidence_rating,q7_biggest_challenge,quiz_score,quiz_total,xp_earned,milestones_json,quiz_details_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(sid,name,level,week,json.dumps(b['ai_tools_used']),b['q1_what_each_ai_does'],b['q2_ai_comparison'],json.dumps(b['web_dev_skills_used']),b['q3_web_dev_progress'],b['q4_daily_life_help'],q5,rating,b['q7_biggest_challenge'],score,8,xp,json.dumps(milestones),json.dumps(breakdown))); con.commit(); row=cur.lastrowid; con.close()
  return jsonify(success=True,submission_id=row,quiz_score=score,quiz_total=8,xp_earned=xp,milestones=milestones,question_breakdown=breakdown),201
 except Exception:return jsonify(success=False,message='Could not save the reflection.'),500

@app.get('/api/student/<student_id>')
def student_progress(student_id):
 who,error=require_identity()
 if error:return error
 sid=student_id.strip().upper()
 if not re.fullmatch(r'[A-Z0-9-]+',sid): return jsonify(success=False,message='Enter a valid learner ID.'),400
 try:
  con=database(); rows=con.execute('SELECT * FROM survey_responses WHERE student_id=? ORDER BY submitted_at ASC',(sid,)).fetchall(); con.close()
  if not rows:return jsonify(success=False,message='No survey submissions found for this learner ID.'),404
  history=[]
  for r in rows:
   item=dict(r)
   for field,key in [('ai_tools_used','ai_tools_used'),('web_dev_skills_used','web_dev_skills_used'),('milestones_json','milestones'),('quiz_details_json','quiz_details')]:
    try:item[key]=json.loads(item.pop(field))
    except Exception:item[key]=[]
   history.append(item)
  xp=sum(int(r['xp_earned']) for r in rows); tiers=[(0,'Tier 1: Foundations',200),(200,'Tier 2: Practitioner',450),(450,'Tier 3: Builder',750),(750,'Tier 4: Architect',None)]
  tier=next(t for t in reversed(tiers) if xp>=t[0]); avg=round(sum(100*r['quiz_score']/max(1,r['quiz_total']) for r in rows)/len(rows),1)
  milestones=list(dict.fromkeys(m for h in history for m in h.get('milestones',[])))
  return jsonify(success=True,student_name=rows[-1]['student_name'],total_submissions=len(rows),total_xp=xp,skill_tier=tier[1],next_tier_xp=tier[2],average_quiz_percentage=avg,latest_confidence=rows[-1]['q6_confidence_rating'],all_unlocked_milestones=milestones,history=history)
 except Exception:return jsonify(success=False,message='Unable to load learning progress.'),500

@app.get('/api/billing/status')
def billing_status():
 who,error=require_identity()
 if error:return error
 secret=os.environ.get('STRIPE_SECRET_KEY',''); ready=bool(secret and os.environ.get('STRIPE_PRICE_ID'))
 if not ready:return jsonify(success=True,premium=False,checkout_enabled=False)
 try:
  con=database(); row=con.execute('SELECT stripe_subscription_id FROM learner_subscriptions WHERE google_sub=?',(who['sub'],)).fetchone()
  if not row:con.close(); return jsonify(success=True,premium=False,checkout_enabled=True)
  sub=stripe_request('GET','/subscriptions/'+row['stripe_subscription_id'],secret)
  active=sub.get('status') in ('active','trialing')
  con.execute('UPDATE learner_subscriptions SET subscription_status=?, updated_at=CURRENT_TIMESTAMP WHERE google_sub=?',(sub.get('status','unknown'),who['sub']));con.commit();con.close()
  return jsonify(success=True,premium=active,checkout_enabled=True)
 except Exception:return jsonify(success=False,message='Membership status is temporarily unavailable.'),503

def stripe_request(method,path,secret,form=None):
 data=urllib.parse.urlencode(form or {}).encode() if form is not None else None
 req=urllib.request.Request('https://api.stripe.com/v1'+path,data=data,method=method,headers={'Authorization':'Bearer '+secret,'Content-Type':'application/x-www-form-urlencoded'})
 with urllib.request.urlopen(req,timeout=12) as res:return json.loads(res.read())

@app.post('/api/billing/checkout')
def billing_checkout():
 who,error=require_identity()
 if error:return error
 secret=os.environ.get('STRIPE_SECRET_KEY',''); price=os.environ.get('STRIPE_PRICE_ID','')
 if not secret or not price:return jsonify(success=False,message='Membership checkout is not configured yet.'),503
 origin=request.host_url.rstrip('/')
 try:
  s=stripe_request('POST','/checkout/sessions',secret,{'mode':'subscription','line_items[0][price]':price,'line_items[0][quantity]':'1','client_reference_id':who['sub'],'metadata[google_sub]':who['sub'],'success_url':origin+'/?membership_session={CHECKOUT_SESSION_ID}','cancel_url':origin+'/?membership=cancel'})
  if not str(s.get('url','')).startswith('https://checkout.stripe.com/'):raise ValueError()
  return jsonify(success=True,checkout_url=s['url'])
 except Exception:return jsonify(success=False,message='Secure checkout could not be started.'),502

@app.post('/api/billing/confirm')
def billing_confirm():
 who,error=require_identity()
 if error:return error
 b=request.get_json(silent=True) or {}; sid=str(b.get('session_id',''))
 if not re.fullmatch(r'cs_(test|live)_[A-Za-z0-9]+',sid):return jsonify(success=False,message='Invalid checkout session.'),400
 secret=os.environ.get('STRIPE_SECRET_KEY','')
 if not secret:return jsonify(success=False,message='Membership checkout is not configured yet.'),503
 try:
  s=stripe_request('GET',f'/checkout/sessions/{sid}?expand%5B%5D=subscription',secret)
  sub=s.get('subscription')
  if isinstance(sub,str):sub=stripe_request('GET','/subscriptions/'+sub,secret)
  if s.get('client_reference_id')!=who['sub'] or s.get('mode')!='subscription' or s.get('status')!='complete' or s.get('payment_status') not in ('paid','no_payment_required') or not isinstance(sub,dict) or sub.get('status') not in ('active','trialing') or not s.get('customer'):return jsonify(success=False,message='Payment could not be confirmed for this account.'),403
  con=database();con.execute('INSERT INTO learner_subscriptions (google_sub,stripe_customer_id,stripe_subscription_id,subscription_status) VALUES (?,?,?,?) ON CONFLICT(google_sub) DO UPDATE SET stripe_customer_id=excluded.stripe_customer_id,stripe_subscription_id=excluded.stripe_subscription_id,subscription_status=excluded.subscription_status,updated_at=CURRENT_TIMESTAMP',(who['sub'],s['customer'],sub['id'],sub['status']));con.commit();con.close()
  return jsonify(success=True,premium=True)
 except Exception:return jsonify(success=False,message='Membership confirmation is temporarily unavailable.'),502

@app.post('/api/billing/portal')
def billing_portal():
 who,error=require_identity()
 if error:return error
 secret=os.environ.get('STRIPE_SECRET_KEY','')
 if not secret:return jsonify(success=False,message='Membership management is not configured yet.'),503
 try:
  con=database();row=con.execute('SELECT stripe_customer_id FROM learner_subscriptions WHERE google_sub=?',(who['sub'],)).fetchone();con.close()
  if not row:return jsonify(success=False,message='No membership is linked to this account.'),404
  result=stripe_request('POST','/billing_portal/sessions',secret,{'customer':row['stripe_customer_id'],'return_url':request.host_url})
  if not str(result.get('url','')).startswith('https://billing.stripe.com/'):raise ValueError()
  return jsonify(success=True,portal_url=result['url'])
 except Exception:return jsonify(success=False,message='Membership management is unavailable.'),502

@app.post('/api/veritas/chat')
def veritas_chat():
 b=request.get_json(silent=True)
 if not isinstance(b,dict):return jsonify(success=False,message='Send a JSON object with a message.'),400
 message=b.get('message')
 if not isinstance(message,str):return jsonify(success=False,message='Message must be text.'),400
 try:
  reply,state=reply_to_veritas(message,b.get('state'))
  return jsonify(success=True,reply=reply,state=state)
 except ValueError as exc:
  return jsonify(success=False,message=str(exc)),400
 except Exception:
  app.logger.exception('Veritas chat request failed')
  return jsonify(success=False,message='Veritas could not answer right now. Please try again.'),500

@app.get('/health')
def health(): return jsonify(status='ok',app='LeArNCoDiNg',runtime='Python')
@app.get('/<path:filename>')
def assets(filename): return send_from_directory(PUBLIC,filename)

if __name__=='__main__': app.run(host='0.0.0.0',port=int(os.environ.get('PORT','8000')))
