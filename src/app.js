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
    const userSchema = joi.object({
        name: joi.string().trim().required()
    });
    
    try{
        const isRepeated = await connection.query('SELECT * FROM categories WHERE name LIKE $1', [name])
        if (isRepeated.rows[0]){
            return res.sendStatus(409);
        }
        const isValid = userSchema.validate({name});
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
        res.send(500);
    }   
});




app.listen(4000, () => {
    console.log('Server listening on 4000');
})