// Force nodemon reload for project option sync
require('dns').setDefaultResultOrder('ipv4first');

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./prisma');
const aiRoutes = require('./routes/ai.routes');

const app = express();

// Permite conexões do app frontend Expo de qualquer origem em produção
app.use(cors());
app.use(express.json());

// Rota de Health Check para o Render
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

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
    console.error('Erro de conexão com o banco de dados:', error);
    res.status(500).json({ 
      error: 'Erro ao conectar com o banco de dados remoto',
      details: error.message || error
    });
  }
});

app.post('/users', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Os campos "name" e "email" são obrigatórios.' });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ 
      error: 'Erro ao criar usuário no banco de dados',
      details: error.message || error
    });
  }
});

// Tratamento global de erros (evita que o app caia em produção)
app.use((err, req, res, next) => {
  console.error('Erro não tratado na aplicação:', err);
  res.status(500).json({
    success: false,
    error: 'Ocorreu um erro interno no servidor.'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
});
