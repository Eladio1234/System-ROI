import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import campanasRoutes from './modules/campanas/campanas.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); 
app.use(express.json()); 

app.get('/', (req, res) => {
    res.json({ mensaje: "¡El servidor del Sistema ROI está vivo!" });
});

app.use('/api/campanas', campanasRoutes);

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});