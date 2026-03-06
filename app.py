from flask import Flask, jsonify, render_template, request

from db import create_gym, init_db, list_disciplines, search_gyms


app = Flask(__name__)


@app.route("/")
def index():
    disciplines = list_disciplines()
    return render_template("index.html", disciplines=disciplines)


@app.route("/api/disciplines")
def api_disciplines():
    return jsonify(list_disciplines())


@app.route("/api/gyms", methods=["GET", "POST"])
def api_gyms():
    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        required = ["name", "discipline", "address", "city", "hours_info"]
        missing = [field for field in required if not str(payload.get(field, "")).strip()]

        if missing:
            return jsonify({"error": f"Campi obbligatori mancanti: {', '.join(missing)}"}), 400

        new_id = create_gym(payload)
        return jsonify({"id": new_id, "status": "created"}), 201

    discipline = request.args.get("discipline")
    query = request.args.get("q")
    results = search_gyms(discipline=discipline, query=query)
    return jsonify(results)


@app.cli.command("init-db")
def init_db_command():
    init_db(seed=True)
    print("Database inizializzato e popolato.")


if __name__ == "__main__":
    init_db(seed=True)
    app.run(debug=True)
