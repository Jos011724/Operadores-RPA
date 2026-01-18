const mongoose = require("mongoose");

// USUARIO
const userSchema = new mongoose.Schema({
  rut: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  password: { type: String, required: true },
  rol: { type: String, enum: ["admin", "operador"], default: "operador" },
  activo: { type: Boolean, default: true },
});

// DRON
const droneSchema = new mongoose.Schema({
  matricula: { type: String, required: true, unique: true },
  modelo: { type: String, required: true },
  estado: {
    type: String,
    enum: ["disponible", "mantencion"],
    default: "disponible",
  },
  horas_vuelo: { type: Number, default: 0 },
});

// BATERÍA
const batterySchema = new mongoose.Schema({
  serial: { type: String, required: true, unique: true },
  ciclos: { type: Number, default: 0 },
  equipo_id: { type: mongoose.Schema.Types.ObjectId, ref: "Drone" },
  estado: { type: String, default: "buena" },
  observacion: { type: String, default: "Sin observaciones" },
});

// VUELO
const flightSchema = new mongoose.Schema({
  operador_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  equipo_id: { type: mongoose.Schema.Types.ObjectId, ref: "Drone" },
  fecha: { type: Date, default: Date.now },
  hora_inicio: { type: String, required: true },
  hora_fin: { type: String, required: true },
  duracion_min: { type: Number, required: true },
  base: { type: String, required: true },
  predio: { type: String, required: true },
  coordenadas: { type: String, required: true },
  observacion: String,
});

module.exports = {
  User: mongoose.model("User", userSchema),
  Drone: mongoose.model("Drone", droneSchema),
  Battery: mongoose.model("Battery", batterySchema),
  Flight: mongoose.model("Flight", flightSchema),
};
