import express from 'express';
import pg from 'pg';
import joi from 'joi';
import dayjs from 'dayjs';

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

    try{
        const querySetting = name === undefined ? "" : name;
        const result = await connection.query(`
            SELECT games.*, categories.name 
            AS "categoryName"
            FROM games
            JOIN categories
            ON categories.id = games."categoryId" 
            WHERE games.name ILIKE $1`
            ,[querySetting+"%"]);
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

app.get('/customers', async (req, res) => {
    const { cpf } = req.query;

    try{
        const querySetting = cpf === undefined ? "" : cpf;
        const result = await connection.query(`SELECT * FROM customers WHERE cpf LIKE $1`, [querySetting+"%"])
        res.send(result.rows)

    } catch(e) {
        console.log(e);
        res.sendStatus(500);
    } 
});

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

app.get('/customers/:id', async (req, res) => {
    const { id } = req.params;

    try{
        const result = await connection.query('SELECT * FROM customers WHERE id = $1', [id]);
        if (!result.rows[0]){
            return res.sendStatus(404);
        } else{
            return res.send(result.rows[0]);
        }

    } catch(e) {
        console.log(e);
        res.sendStatus(500);
    } 
});

app.put('/customers/:id', async (req, res) => {
    const { name, phone, cpf, birthday } = req.body;
    const { id } = req.params;
    const customersSchema = joi.object({
        name: joi.string().trim().required(),
        phone: joi.string().min(10).max(11).regex(/^[0-9]+$/).required(),
        cpf: joi.string().length(11).regex(/^[0-9]+$/).required(),
        birthday: joi.date()
    });

    try{
        const idExists = await connection.query('SELECT * FROM customers WHERE id = $1', [id]);
        if (idExists.rows[0].cpf !== cpf){
            const cpfExists = await connection.query('SELECT * FROM customers WHERE cpf = $1', [cpf]);
            if (cpfExists.rows[0]){
                return res.sendStatus(409);
            }
        }

        const isValid = customersSchema.validate({name, phone, cpf, birthday});
        if (isValid.error === undefined){
            await connection.query('UPDATE customers SET name=$1, phone=$2, cpf=$3, birthday=$4 WHERE id = $5', [name, phone, cpf, birthday, id]);
            return res.sendStatus(200); 
        } else{
            return res.sendStatus(400);
        }

    } catch(e) {
        console.log(e);
        res.sendStatus(500);
    } 
});


/* Rentals routes */

app.post('/rentals', async (req, res) => {
    const { customerId, gameId, daysRented } = req.body;
    const rentalsSchema = joi.object({
        customerId: joi.number(),
        gameId: joi.number(),
        daysRented: joi.number().min(1)
    });

    try{
        const customerExists = await connection.query('SELECT * FROM customers WHERE id = $1', [customerId]);
        const gameExists = await connection.query('SELECT * FROM games WHERE id = $1', [gameId]);
        const games = await connection.query('SELECT * FROM rentals WHERE "gameId" = $1', [gameId]);
        const rentedGames = games.rows.filter(item => item.returnDate === null);
        const isValid = rentalsSchema.validate({customerId, gameId, daysRented});


        const rentDate = dayjs().format('YYYY-MM-DD');
        const originalPrice = gameExists.rows[0].pricePerDay * daysRented;

        if ((isValid.error === undefined) && customerExists.rows[0] && gameExists.rows[0] && (rentedGames.length < gameExists.rows[0].stockTotal)){
            await connection.query(`
                INSERT INTO rentals 
                ("customerId", "gameId", "rentDate", "daysRented", "returnDate", "originalPrice", "delayFee")
                VALUES ($1,$2,$3,$4,$5,$6,$7)
                `, [customerId, gameId, rentDate, daysRented, null, originalPrice, null]);
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