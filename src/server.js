require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./prisma');
const aiRoutes = require('./routes/ai.routes');

const app = express();

// Permite conexões do app frontend Expo
app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api/ai', aiRoutes);

app.get('/', (req, res) => {
  res.send('Kod Finance API 🚀');
});

app.get('/test-db', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao conectar com banco' });
  }
});

app.post('/users', async (req, res) => {
  try {
    const { name, email } = req.body;

    const user = await prisma.user.create({
      data: {
        name,
        email
      }
    });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
});
