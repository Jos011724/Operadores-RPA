require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 5000;

const MONGO_DB_URI =
  "mongodb+srv://admin_rpa:011724@operadoresrpa.qpzxjty.mongodb.net/BaseDatosRPA?retryWrites=true&w=majority&appName=OperadoresRPA";

app.use(cors());
app.use(express.json());

mongoose
  .connect(MONGO_DB_URI)
  .then(async () => {
    console.log("✅ MongoDB Conectado");

    try {
      await mongoose.connection.collection("users").drop();
      console.log("🧹 Base de datos de USUARIOS limpiada y regenerada.");
    } catch (error) {
      // Si no existe, no pasa nada, seguimos.
    }
    // ---------------------------------------------------------

    // Crear al Admin limpio desde cero
    const hashedPassword = await bcrypt.hash("1234", 10);
    await User.create({
      run: "admin",
      nombre: "Administrador",
      apellido: "Sistema",
      password: hashedPassword,
      rol: "admin",
      activo: true,
    });
    console.log("👑 ADMIN REINICIADO (Login: admin / 1234)");
  })
  .catch((err) => console.error("❌ Error MongoDB:", err));

// --- MODELOS ---
const userSchema = new mongoose.Schema({
  run: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  password: { type: String, required: true },
  rol: { type: String, enum: ["admin", "operador"], default: "operador" },
  activo: { type: Boolean, default: true },
});

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

const batterySchema = new mongoose.Schema({
  serial: { type: String, required: true, unique: true },
  ciclos: { type: Number, default: 0 },
  equipo_id: { type: mongoose.Schema.Types.ObjectId, ref: "Drone" },
  observacion: { type: String, default: "" },
  estado: { type: String, default: "buena" },
});

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

const User = mongoose.model("User", userSchema);
const Drone = mongoose.model("Drone", droneSchema);
const Battery = mongoose.model("Battery", batterySchema);
const Flight = mongoose.model("Flight", flightSchema);

// --- MIDDLEWARES ---
const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Acceso denegado" });
  try {
    const decoded = jwt.verify(token, "secreto_super_seguro");
    req.usuario = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: "Token inválido" });
  }
};
const verificarAdmin = (req, res, next) => {
  if (req.usuario.rol !== "admin")
    return res.status(403).json({ error: "Requiere Admin" });
  next();
};

// --- RUTAS ---
app.post("/api/auth/login", async (req, res) => {
  const { run, password } = req.body;
  try {
    const user = await User.findOne({ run });
    if (!user || !user.activo)
      return res.status(401).json({ error: "Usuario no válido" });
    if (!(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: "Clave incorrecta" });

    const token = jwt.sign(
      {
        id: user._id,
        rol: user.rol,
        run: user.run,
        nombre: user.nombre,
        apellido: user.apellido,
      },
      "secreto_super_seguro",
    );
    res.json({ token, rol: user.rol, run: user.run });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// USUARIOS (CON LOGS DE ERROR DETALLADOS)
app.get("/api/users", verificarToken, verificarAdmin, async (req, res) =>
  res.json(await User.find({}, "-password")),
);

app.post("/api/users", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { run, password, rol, nombre, apellido } = req.body;

    // Validamos qué falta
    if (!run) return res.status(400).json({ error: "Falta R.U.N." });
    if (!nombre) return res.status(400).json({ error: "Falta Nombre" });
    if (!apellido) return res.status(400).json({ error: "Falta Apellido" });
    if (!password) return res.status(400).json({ error: "Falta Contraseña" });

    // Verificamos duplicado
    const existe = await User.findOne({ run });
    if (existe)
      return res
        .status(400)
        .json({ error: "El R.U.N. ya existe en el sistema" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      run,
      nombre,
      apellido,
      password: hashedPassword,
      rol,
      activo: true,
    });

    console.log("✅ Usuario creado exitosamente:", newUser.run);
    res.json(newUser);
  } catch (e) {
    // AQUÍ VEMOS EL ERROR REAL EN LA CONSOLA
    console.error("❌ ERROR CRÍTICO AL CREAR USUARIO:", e);
    res.status(500).json({ error: e.message || "Error interno en BD" });
  }
});

app.put("/api/users/:id", verificarToken, verificarAdmin, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { activo: req.body.activo });
  res.json({ message: "OK" });
});
app.delete(
  "/api/users/:id",
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Eliminado" });
  },
);

// FLOTA
app.get("/api/drones", verificarToken, async (req, res) =>
  res.json(await Drone.find()),
);
app.post("/api/drones", verificarToken, verificarAdmin, async (req, res) => {
  try {
    res.json(await Drone.create(req.body));
  } catch (e) {
    res.status(400).json({ error: "Matrícula duplicada" });
  }
});
app.delete(
  "/api/drones/:id",
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    await Drone.findByIdAndDelete(req.params.id);
    res.json({ message: "Dron eliminado" });
  },
);

// BATERÍAS
app.get("/api/baterias", verificarToken, async (req, res) =>
  res.json(await Battery.find().populate("equipo_id", "matricula modelo")),
);
app.post("/api/baterias", verificarToken, verificarAdmin, async (req, res) => {
  try {
    res.json(await Battery.create(req.body));
  } catch (e) {
    res.status(400).json({ error: "Serial duplicado" });
  }
});
app.put("/api/baterias/ciclos/:id", verificarToken, async (req, res) => {
  const { nuevos_ciclos, observacion } = req.body;
  await Battery.findByIdAndUpdate(req.params.id, {
    ciclos: nuevos_ciclos,
    observacion,
  });
  res.json({ message: "Actualizado" });
});
app.delete(
  "/api/baterias/:id",
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    await Battery.findByIdAndDelete(req.params.id);
    res.json({ message: "Batería eliminada" });
  },
);

// VUELOS
app.get("/api/vuelos", verificarToken, async (req, res) => {
  const vuelos = await Flight.find()
    .populate("operador_id", "run nombre apellido")
    .populate("equipo_id", "matricula")
    .sort({ fecha: -1 });
  res.json(vuelos);
});
app.post("/api/vuelos", verificarToken, async (req, res) => {
  try {
    const {
      equipo_id,
      base,
      hora_inicio,
      hora_fin,
      duracion_min,
      predio,
      coordenadas,
      observacion,
      fecha,
    } = req.body;
    if (duracion_min <= 0 || new Date(fecha) > new Date())
      return res.status(400).json({ error: "Datos inválidos" });
    const vuelo = await Flight.create({
      operador_id: req.usuario.id,
      equipo_id,
      base,
      hora_inicio,
      hora_fin,
      duracion_min,
      predio,
      coordenadas,
      observacion,
      fecha,
    });
    await Drone.findByIdAndUpdate(equipo_id, {
      $inc: { horas_vuelo: duracion_min / 60 },
    });
    res.json(vuelo);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server OK en puerto ${PORT}`));
