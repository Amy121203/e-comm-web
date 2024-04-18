const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());

const sequelize = new Sequelize('ecomm', 'postgres', '2110990169', {
  host: 'localhost',
  dialect: 'postgres'
});


// User model
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

const Product = sequelize.define('Product', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

const CartItem = sequelize.define('CartItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
});

sequelize.sync({ force: false }).then(() => {
  console.log('Database synchronized');
}).catch(err => {
  console.error('Error synchronizing database:', err);
});



// Middleware for token verification
async function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).send('A token is required for authentication');
  try {
    const decodedToken = jwt.verify(token.split(' ')[1], 'YOUR_SECRET_KEY'); // Split to remove 'Bearer'
    const user = await User.findByPk(decodedToken.userId); // Assuming your User model has a 'userId' field
    if (!user) return res.status(401).send('Invalid Token');
    req.user = { userId: user.id }; // Attach user ID to the request
    next();
  } catch (err) {
    return res.status(401).send('Invalid Token');
  }
}

// Register user
app.post('/register', async (req, res) => {
  try {
    const hashedPassword = bcrypt.hashSync(req.body.password, 8);
    const user = await User.create({
      username : req.body.name,
      password : hashedPassword
    })
    res.status(201).json(user);
  } catch (error) {
    console.error('_________________++++++++++Error registering user:', error); // Log the error
    res.status(500).send('Error registering user');
  }
});

// Login user
app.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ where: { username: req.body.username } });
    if (user && bcrypt.compareSync(req.body.password, user.password)) {
      const token = jwt.sign({ userId: user.id }, 'YOUR_SECRET_KEY'); // Assuming your user model has an 'id' field
      res.json({ token });
    } else {
      res.status(401).send('Invalid credentials');
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('Error during login');
  }
});


app.post('/products', async (req, res) => {
  try {
    const { name, price, description } = req.body;

    const newProduct = await Product.create({
      name,
      price,
      description
    });

    res.status(201).json({ success: true, data: newProduct });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ success: false, error: 'Error adding product' });
  }
});
app.get('/products', async (req, res) => {
  try {
    const products = await Product.findAll();
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: 'Error fetching products' });
  }
});

// Read a single product
app.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    if (product) {
      res.status(200).json({ success: true, data: product });
    } else {
      res.status(404).json({ success: false, error: 'Product not found' });
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, error: 'Error fetching product' });
  }
});

// Update a product
app.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, description } = req.body;

    const product = await Product.findByPk(id);
    if (product) {
      await product.update({
        name,
        price,
        description
      });
      res.status(200).json({ success: true, data: product });
    } else {
      res.status(404).json({ success: false, error: 'Product not found' });
    }
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, error: 'Error updating product' });
  }
});

// Delete a product
app.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    if (product) {
      await product.destroy();
      res.status(200).json({ success: true, message: 'Product deleted successfully' });
    } else {
      res.status(404).json({ success: false, error: 'Product not found' });
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: 'Error deleting product' });
  }
});


// add to cart
app.post('/cart', verifyToken, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    // Check if the product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).send('Product not found');
    }

    // Check if the user already has the product in the cart
    let cartItem = await CartItem.findOne({
      where: {
        userId: req.user.userId,
        productId: productId
      }
    });

    // If the product is already in the cart, update the quantity
    if (cartItem) {
      cartItem.quantity += quantity;
      await cartItem.save();
    } else {
      // If the product is not in the cart, create a new cart item
      cartItem = await CartItem.create({
        userId: req.user.userId,
        productId: productId,
        quantity: quantity
      });
    }

    res.status(201).send('Item added to cart successfully');
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).send('Error adding item to cart');
  }
});

const PORT = 8001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});