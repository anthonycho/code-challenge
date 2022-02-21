const {TASK_SCHEMA} = require('../library/databaseEnum');
const database = require('../modules/database');
const todo = require('express').Router();

async function processPost(req) {
    const todoId = req.params.todoId;
    const data =  req.body;
    data['_id'] = todoId;
    return database.updateTodo(data);
}

todo.post('/', async (req, res, next) => {
    try {
        res.send(await processPost(req));
    } catch(e) {
        next(e);
    }
});

todo.route('/:todoId')
    .get(async (req, res, next) => {
        try {
            const todoId = req.params.todoId;
            const todo = await database.queryTodo({_id : todoId});
            const tasks = await database.queryTasks({[TASK_SCHEMA.TODO] : todoId})
            res.send({
                todo: todo,
                tasks: tasks
            });
        } catch (e) {
            next(e);
        }
        
    })
    .post(async (req, res, next) => {
        try {
            res.send(await processPost(req));
        } catch(e) {
            next(e);
        }
    })
    .delete(async (req, res, next) => {
        try {
            const todoId = req.params.todoId;
            res.send(await database.deleteSingleTodo(todoId));
        } catch(e) {
            next(e);
        }
        
    });

module.exports = todo;
