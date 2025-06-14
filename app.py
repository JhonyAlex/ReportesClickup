import os
from flask import Flask, jsonify, request
import requests

app = Flask(__name__)

@app.route("/api_tareas.php", methods=["GET"])
def obtener_tareas():
    team_id = request.args.get("team_id")
    token = os.environ.get("CLICKUP_TOKEN")

    if not team_id or not token:
        return jsonify({"error": "Parámetro team_id o token faltante"}), 400

    # Ejemplo de llamada a la API de ClickUp (puedes personalizarla)
    url = f"https://api.clickup.com/api/v2/team/{team_id}/task"
    headers = {"Authorization": token}

    response = requests.get(url, headers=headers)
    return jsonify(response.json())

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
