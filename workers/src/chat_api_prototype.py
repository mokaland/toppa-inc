import json

def handle_chat_request(request_body_str):
    try:
        request_body = json.loads(request_body_str)
        user_id = request_body.get('user_id')
        session_id = request_body.get('session_id')
        message = request_body.get('message') # 空文字列も許容

        if not user_id or not session_id: # user_idとsession_idのみを必須とする
            return json.dumps({"status": "error", "message": "Missing required fields: user_id or session_id"}, ensure_ascii=False), 400
        
        if message is None: # message自体が存在しない場合はエラー
             return json.dumps({"status": "error", "message": "Missing required field: message"}, ensure_ascii=False), 400

        # AI Providerへのリクエストをシミュレート
        ai_response_content = f"AIからの応答: {message} についてですね。"

        # Supabaseへのメッセージ保存をシミュレート
        # 実際にはここでDBクライアントを呼び出す
        # print(f"Supabaseに保存: user_id={user_id}, session_id={session_id}, role='user', content='{message}'")
        # print(f"Supabaseに保存: user_id={user_id}, session_id={session_id}, role='assistant', content='{ai_response_content}'")

        return json.dumps({
            "status": "success",
            "user_id": user_id,
            "session_id": session_id,
            "ai_response": ai_response_content
        }, ensure_ascii=False), 200

    except json.JSONDecodeError:
        return json.dumps({"status": "error", "message": "Invalid JSON format"}, ensure_ascii=False), 400
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)}, ensure_ascii=False), 500
