import os
from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/api_tareas.php", methods=["GET"])
def obtener_tareas():
    # Aquí puedes poner lógica real luego
    return jsonify({"mensaje": "API funcionando correctamente", "estado": "ok"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
