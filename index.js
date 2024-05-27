const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 8080;
const secretToken = "9c56fd38d522556e61358cc7653a8ec0"

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));


let data = JSON.parse(fs.readFileSync('./database.json', 'utf-8'));

// Middleware para verificar se o usuário está autenticado
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);
    jwt.verify(token, secretToken, (err, user) => {
        if (err) return res.sendStatus(403);
    
        req.user = user;
        next();
    });
}

// Rota para as páginas
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/public/register.html');
});

app.get('/profile', (req, res) => {
    res.sendFile(__dirname + '/public/profile.html');
});

app.get('/notes', (req, res) => {
    res.sendFile(__dirname + '/public/dashboard.html');
});

app.get('/note/:id', (req, res) => {
    res.sendFile(__dirname + '/public/note.html');
});

app.get('/new', (req, res) => {
    res.sendFile(__dirname + '/public/register-note.html');
});

// Endpoint para login de usuários
app.post('/session', (req, res) => {
    const { email, password } = req.body;
    const user = data.users.find(user => user.email === email && user.password === password);

    if (!user) return res.status(401).json({ message: "Invalid email or password." });

    const userRes = {
        id: user.id,
        name: user.name,
        email: user.email
    }

    const accessToken = jwt.sign({ userId: user.id}, secretToken);
    res.json({ accessToken, userRes });
});

// Endpoint para registro de usuários
app.post('/register', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(404).json({message:"Name, email and password are required."});
    }
    
    const user = data.users.find(user => user.email === email);

    if (user) return res.status(400).json({ message: "User exists." });

    const newUser = { id: uuidv4(), name, email, password };
    data.users.push(newUser);
    fs.writeFileSync('./database.json', JSON.stringify(data, null, 2));
    res.json(newUser);
});

app.put('/users/update', authenticateToken, (req, res) => {
    const { name, email, oldPassword, newPassword } = req.body;
    const { userId } = req.user;

    if (!name || !email) {
        return res.status(404).json({message:"Name and email are required."});
    }
    
    const user = data.users.find(user => user.id === userId);

    if(newPassword && oldPassword !== user.password){
        return res.status(400).json({message:"Old Password incorrect."});
    }

    const users = data.users.map(u => {
        if(u.id === user.id){
            u.name = name;
            u.email = email;
            u.password = !newPassword ? user.password : newPassword;

            return u;
        }

        return u;
    });

    data.users = users;
    fs.writeFileSync('./database.json', JSON.stringify(data, null, 2));
    res.json(user);
});

app.get('/users/notes', authenticateToken, (req, res) => {
    const { userId } = req.user;
    const notes = data.notes.filter(note => note.userId === userId);
    res.json(notes);
})

app.post('/notes', authenticateToken, (req, res) => {
    const { title, content, link } = req.body;
    const { userId } = req.user;

    if (!title || !content ) {
        return res.status(400).json({message:"Title and content are required."});
    }
    
    const newNote = { id: uuidv4(), userId, title, content, link };
    data.notes.push(newNote);
    fs.writeFileSync('./database.json', JSON.stringify(data, null, 2));
    res.json(newNote);
});

app.get('/notes/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const note = data.notes.find(note => note.id === id);
    res.json(note);

});

app.delete('/notes/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const notes = data.notes.filter(note => note.id !== id);
    data.notes = notes;
    fs.writeFileSync('./database.json', JSON.stringify(data, null, 2));
    res.status(204).send();

});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
