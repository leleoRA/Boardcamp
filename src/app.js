import express from 'express';
import pg from 'pg';
import joi from 'joi';

const { Pool } = pg;

const connection = new Pool({
    user: 'bootcamp_role',
    password: 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp',
    host: 'localhost',
    port: 5432,
    database: 'boardcamp'
});

const app = express();
app.use(express.json());

/* Categories routes */

app.get('/categories', async (req, res) => {
    
    try{
        const result = await connection.query('SELECT * FROM categories');
        res.send(result.rows);

    } catch(e) {
        console.log(e);
        res.send(500);
    }
});

app.post('/categories', async (req, res) => {
    const { name } = req.body;
    const categoriesSchema = joi.object({
        name: joi.string().trim().required()
    });
    
    try{
        const isRepeated = await connection.query('SELECT * FROM categories WHERE name LIKE $1', [name])
        if (isRepeated.rows[0]){
            return res.sendStatus(409);
        }
        const isValid = categoriesSchema.validate({name});
        if (isValid.error === undefined){
            await connection.query('INSERT INTO categories (name) VALUES ($1)', [name]);
            res.sendStatus(201); 
        } else {
            if (isValid.error.details[0].type === 'string.empty'){
                return res.sendStatus(400);
            }
        }

    } catch(e) {
        console.log(e);
        res.sendStatus(500);
    }   
});

/* Games routes */

app.get('/games', async (req, res) => {
    const  { name } = req.query;
    const querySetting = name === undefined ? "" : name;

    try{
        const result = await connection.query(`
            SELECT games.*, categories.name 
            AS "categoryName"
            FROM games
            JOIN categories
            ON categories.id = games."categoryId" 
            WHERE categories.name ILIKE $1`
            ,[querySetting+'%']);
        res.send(result.rows);

    } catch(e) {
        console.log(e);
        res.sendStatus(500);
    }   
});

app.post('/games', async(req, res) => {
    const { name, image, stockTotal, categoryId, pricePerDay } = req.body;
    const gamesSchema = joi.object({
        name: joi.string().trim().required(),
        image: joi.string().uri().pattern(/^http([^\s]+(?=\.(jpg|gif|png))\.\2)/).required(),
        stockTotal: joi.number().integer().min(1).required(),
        categoryId: joi.number().integer().min(1).required(),
        pricePerDay: joi.number().integer().min(1).required()
    });
    
    try{
        const isRepeated = await connection.query('SELECT * FROM games WHERE name LIKE $1', [name]);
        if (isRepeated.rows[0]){
            return res.sendStatus(409);
        }
        const categoryIdExists = await connection.query('SELECT * FROM categories WHERE id = $1', [categoryId]);
        if (!categoryIdExists.rows[0]){
            return res.sendStatus(400);
        }
        const isValid = gamesSchema.validate({name, image, stockTotal, categoryId, pricePerDay});
        if (isValid.error === undefined){
            await connection.query('INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1,$2,$3,$4,$5)', [name, image, stockTotal, categoryId, pricePerDay]);
            return res.sendStatus(201); 
        } else{
            return res.sendStatus(400);
        }

    } catch(e) {
        console.log(e);
        res.sendStatus(500);
    } 
});

/* Customers route */

app.post('/customers', async (req, res) => {
    const { name, phone, cpf, birthday } = req.body;
    const customersSchema = joi.object({
        name: joi.string().trim().required(),
        phone: joi.string().min(10).max(11).regex(/^[0-9]+$/).required(),
        cpf: joi.string().length(11).regex(/^[0-9]+$/).required(),
        birthday: joi.date()
    });

    try{
        const cpfExists = await connection.query('SELECT * FROM customers WHERE cpf = $1', [cpf]);
        if (cpfExists.rows[0]){
            return res.sendStatus(409);
        }

        const isValid = customersSchema.validate({name, phone, cpf, birthday});
        if (isValid.error === undefined){
            await connection.query('INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1,$2,$3,$4)', [name, phone, cpf, birthday]);
            return res.sendStatus(201); 
        } else{
            return res.sendStatus(400);
        }


    } catch(e) {
        console.log(e);
        res.sendStatus(500);
    } 
});



app.listen(4000, () => {
    console.log('Server listening on 4000');
})