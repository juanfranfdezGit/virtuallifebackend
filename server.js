// Insertamos los modulos necesarios en la app
const express = require('express');
// Conectar con MySql
const mysql = require('mysql2');
// Manejo del token
const jwt = require('jsonwebtoken');
// Habilitar Cors para solicitudes de diferentes orígenes
const cors = require('cors');

const app = express();
// Seleccionamos el puerto
const port = 3001;
// Clave secreta para el Tokceen
const JWT_SECRET = 'virtuallife-sessions';

// Llamamos a cors
app.use(cors());
// Para recibir JSON
app.use(express.json());

// Credenciales de nuestra Base de datos
const db = mysql.createConnection({
    host: 'bfejnnwpscziwzdituf5-mysql.services.clever-cloud.com', 
    user: 'ucyw95fqpblb2tzg',     
    password: '8oaCaAGLQe5I1bQqKcwc',
    database: 'bfejnnwpscziwzdituf5',
});

// Conexion a la base de datos
db.connect((err) => {
    if (err) {
        // Mensaje de error en conexion 
        console.error('Error conectando a la DB:', err);
        return;
    }
    // Mensaje en caso de exito
    console.log('Conectado a DB correctamente');
});

app.get('/', (req, res) => {
  res.status(200).send('OK');
})

// Obtencion de los productos que iran a nuestro Hero
app.get('/api/heroProductos', (req, res) => {
  // Consulta para obtener los productos
  const productsQuery = 'SELECT * FROM productos';
  
  db.query(productsQuery, (err, results) => {
    if (err) {
      // Muestra error en caso de fallar
      console.error('Error:', err);
      res.status(500).send('Server error');
    } else {
      // En caso de exito muestra los productos que iran al hero,
      // en este caso he decidido que sean los 3 primeros.
      res.json(results.slice(0, 3));
    }
  });
});


// Obtencion de los productos
app.get('/api/productos', (req, res) => {
  // Consulta para obtener los productos
  const productsQuery = 'SELECT * FROM productos';
  
  db.query(productsQuery, (err, results) => {
    if (err) {
      // Muestra error en caso de fallar
      console.error('Error:', err);
      res.status(500).send('Server error');
    } else {
      // En caso de exito muestra los productos de la tabla
      res.json(results);
    }
  });
});

// Post para iniciar seison
app.post('/api/login', async (req, res) => {
  // Extrae de la web el email y la contraseña
  const { email, password } = req.body;

  // Consulta para buscar el usuario en la tabla
  const query = 'SELECT * FROM users WHERE email = ?';

  db.query(query, [email], (err, results) => {
    // Mensaje de error
    if (err) return res.status(500).json({ error: 'Error en el servidor' });
    
    if (results.length === 0) {
      // Mensaje en caso de no encontrar el usuario
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    // Obtiene el usuario si lo encuentra
    const user = results[0];
    
    // Comprueba que la contraseña mandada coincida con la de la tabla
    if (user.contraseña !== password) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // En caso de exito generamos el token JWT, durara 1 hora
    const token = jwt.sign({ userId: user.ID_user }, 'virtuallife-sessions', { expiresIn: '1h' });
    
    // Responde con mensaje de exito y con el token de sesion
    res.json({ message: 'Login exitoso', token });
  });
});

// Post para regitrar usuarios
app.post('/api/registro', async (req, res) => {
  // Extraemos de la web los datos a introducir en la tabla
  const { email, password, nombre, apellido, direccion, dni } = req.body;

  // Validamos que se proporcionen todos los campos necesarios
  if (!email || !password || !nombre || !apellido || !direccion || !dni) {
    return res.status(400).json({ error: 'Rellenar todos los campos' });
  }

  // Verificamos si el usuario ya existe
  const checkQuery = 'SELECT * FROM users WHERE email = ?';
  db.query(checkQuery, [email], (err, results) => {
    // Mensaje de error
    if (err) {
      console.error('Error de consulta:', err);
      return res.status(500).json({ error: 'Error en el servidor' });
    }

    // Mensaje si el usuario ya existe en nuestra base de datos
    if (results.length > 0) {
      return res.status(400).json({ error: 'El email ya existe' });
    }

    // Consulta para insertar un nuevo usuario
    const insertQuery = 'INSERT INTO users (email, contraseña, nombre, apellido, direccion, dni) VALUES (?, ?, ?, ?, ?, ?)';
    
    // Insertamos el nuevo usuario en la base de datos
    db.query(insertQuery, [email, password, nombre, apellido, direccion, dni], (err, results) => {
      if (err) {
        console.error('Error: ', err);
        return res.status(500).json({ error: 'Error en el servidor' });
      }

      // mensaje de exito
      res.json({ message: 'Registro exitoso' });
    });
  });
});

// Obtenemos los datos del usuario
app.get('/api/userActive', verifyToken, (req, res) => {
  // Recogemos desde el token el ID del usuario
  const userId = req.userId ;
  
  // Consulta para obtener los datos del usuario en cuestion
  const query = 'SELECT * FROM users WHERE ID_user = ?';
  db.query(query, [userId ], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error en el servidor' });
    
    if (results.length === 0) {
      // Mensaje de usuario no encontrado
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Obtenemos los datos del usuario encontrado
    const user = results[0];
    // Mandamos los datos
    res.json({
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
      direccion: user.direccion,
      dni: user.dni
    });
  });
});

// Modificamos los datos del usuario
app.put('/api/updateUser', verifyToken, (req, res) => {
  // Obtenemos los datos del front
  const { email, nombre, apellido, direccion, dni } = req.body;

  // Validamos que se proporcionen todos los campos
  if (!email || !nombre || !apellido || !direccion || !dni) {
    return res.status(400).json({ error: 'Rellenar todos los campos' });
  }

  // Obtenemos el ID del usuario
  const userId = req.userId;

  // Query para actualizar los datos
  const updateQuery = `
    UPDATE users 
    SET email = ?, nombre = ?, apellido = ?, direccion = ?, dni = ?
    WHERE ID_user = ?
  `;

  // Ejecutamos la consulta
  db.query(updateQuery, [email, nombre, apellido, direccion, dni, userId], (err, results) => {
    if (err) {
      console.error('Error al actualizar los datos del usuario:', err);
      return res.status(500).json({ error: 'Error en el servidor' });
    }

    // Comprobamos si se modificó algún registro
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Mensaje de éxito
    res.json({ message: 'Datos del usuario actualizados correctamente' });
  });
});

// Realizar el pedido del carrito
app.post('/api/pedido', verifyToken, (req, res) => {
  // Obtenemos los productos del cuerpo de la petición
  const { items } = req.body; 
  // Obtenemos el ID del usuario desde el token
  const userId = req.userId; 

  // Preparamos los valores para insertarlos
  const historyItems = items.map(item => [userId, item.id_product, item.qty]);

  // Consulta para añadir a la tabla
  const queryInsertHistory = 'INSERT INTO history (id_usuario, id_product, qty) VALUES ?';

  // Insertamos los productos en la tabla
  db.query(queryInsertHistory, [historyItems], (err) => {
    if (err) {
      console.error('Error al añadir items al history:', err);
      return res.status(500).json({ error: 'Error al añadir items al history' });
    }
    // Mensaje de exito
    res.status(201).json({ message: 'Items añadidos al history con éxito' });
  });
});

// Obtener el historial de pedidos
app.get('/api/history', verifyToken, (req, res) => {
  // Obtenemos el ID del usuario desde el token
  const userId = req.userId; 

  // Consulta para obtener el historial de pedidos uniendo tablas
  const query = `
        SELECT h.id_history, h.qty, p.nombre_product, p.precio 
        FROM history h 
        JOIN productos p ON h.id_product = p.ID_product 
        WHERE h.id_usuario = ?`;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error en la consulta:', err);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
    // Envia el historial de pedidos
    res.json(results);
  });
});

// Obtener la lista de deseos segun el usuario
app.get('/api/wishlist/:productId', verifyToken, (req, res) => {
  // Obtenemos el ID del usuario desde el token
  const userId = req.userId;
  // Sacamos la ID del producto desde la URL
  const productId = req.params.productId;

  // Consulta para buscar los datos del producto
  const query = 'SELECT * FROM wishlist WHERE id_usuario = ? AND id_product = ?';

  db.query(query, [userId, productId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error en el servidor' });
    if (results.length > 0) {
      // Responde con que el producto existe
      return res.json({ exists: true });
    } else {
      // Responde que el producto no existe
      return res.json({ exists: false });
    }
  });
});

// Añadir producto a la lista de deseos
app.post('/api/wishlist', verifyToken, (req, res) => {
  // Obtenemos el ID del usuario desde el token
  const userId = req.userId;
  // Sacamos la ID del producto desde la app
  const { productId } = req.body;

  // Consulta para añadir el producto a la lista
  const query = 'INSERT INTO wishlist (id_usuario, id_product) VALUES (?, ?)';

  db.query(query, [userId, productId], (err) => {
    if (err) return res.status(500).json({ error: 'Error en el servidor' });
    res.status(201).json({ message: 'Producto añadido a la wishlist' });
  });
});

// Obtener la lista de deseos
app.get('/api/wishlist', verifyToken, (req, res) => {
  // Obtenemos el ID del usuario desde el token
  const userId = req.userId; 

  // Consulta para obtener el historial de pedidos uniendo las tablas
  const query = `
      SELECT p.ID_product, p.nombre_product, p.descripcion, p.img, p.precio, p.plataforma 
      FROM wishlist w
      JOIN productos p ON w.id_product = p.ID_product
      WHERE w.id_usuario = ?`;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error en la consulta:', err);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
    // Responde con la lista de deseos
    res.json(results);
  });
});

// Eliminar producto de la lista de deseos
app.delete('/api/wishlist/:productId', verifyToken, (req, res) => {
  // Obtenemos el ID del usuario desde el token
  const userId = req.userId; 
  // ID del producto a eliminar recogida de la URL
  const productId = req.params.productId; 

  // Consuta para eliminar el producto de la lista
  const query = 'DELETE FROM wishlist WHERE id_usuario = ? AND id_product = ?';

  db.query(query, [userId, productId], (err) => {
    if (err) return res.status(500).json({ error: 'Error en el servidor' });
    res.status(200).json({ message: 'Producto eliminado de la wishlist' });
  });
});

// Verificacion del Token de sesion
function verifyToken(req, res, next) {
  // Obtener el encabezado de autorizacion
  const authHeader = req.headers['authorization'];

  // Respuesta en caso de no obtenerlo
  if (!authHeader) return res.status(403).json({ error: 'Token no proporcionado' });

  // Respues si obtenemos el token
  const token = authHeader.split(' ')[1];

  // Verificamos el token con JWT
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(500).json({ error: 'Token no válido' });
    // Guarda el ID del usuario
    req.userId = decoded.userId;
    next();
  });
}

// Iniciamos la sesion en el puesto indicado anteriormente
app.listen(port, () => {
  console.log(`Servidor ejecutándose en ${port}`);
});

