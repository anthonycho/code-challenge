const {TASK_SCHEMA, STATUS_ENUM} = require('../library/databaseEnum');
const {isValid, parseISO, endOfDay, addDays, startOfDay } = require('date-fns');
const {username} = require('../library/constants');
const task = require('express').Router();
const database = require('../modules/database');

async function processPost(req) {
    const taskId = req.params.taskId;
    const data =  req.body;
    if (req.body.todoId) {
        data[TASK_SCHEMA.TODO] = req.body.todoId;
    }
    data['_id'] = taskId;
    console.log(data)
    return database.updateTask(data);
}

task.route('/')
    .get(async (req, res, next) => {
        //username, startTime, endTime
        const data = {
            username: req.query.username || username,
            endDay: req.query.endDay,
            startDay: req.query.startDay,
            days: req.query.days,
            status: req.query.status
        }
        // try parsing dates
        let endTime;
        let startTime;
        try {
            endTime = data.endDay ? parseISO(data.endDay) : addDays(endOfDay(new Date()), data.days || 7);
            startTime = data.startDay ? parseISO(data.startDay) : new Date();
            if (!isValid(endTime) || !isValid(startTime)) {
                throw "Invalid Date";
            }
            res.send(await database.getExpiringTasks(data.username, startTime, endTime));
        } catch (error) {
            if (error === 'Invalid Date') {
                return next({
                    message: 'Please enter a valid ISO date (yyyy-mm-dd)',
                    status: 400
                  });
            } 
            return next(error);
        }
        
    })
    .post(async (req, res, next) => {
        // set defaults
        req.body = req.body || {};
        Object.assign(req.body, {
            [TASK_SCHEMA.CREATOR]: username,
            [TASK_SCHEMA.ASSIGNED]: username,
            [TASK_SCHEMA.STATUS]: STATUS_ENUM.NEW,
            [TASK_SCHEMA.DUE_DATE]: addDays(endOfDay(new Date()), 7),
            [TASK_SCHEMA.TITLE]: '',
            [TASK_SCHEMA.DESCRIPTION]: ''
        })
        const result = await processPost(req).catch((e) => {
            return next(e);
        });
        res.send(result);
    });

task.route('/:taskId')
    .get(async (req, res, next) => {
        try {
            const taskId = req.params.taskId;
            res.send(await database.queryTasks({_id : taskId}))
        } catch(e) {
            next(e);
        }
    })
    .post(async (req, res, next) => {
        try {
            res.send(await processPost(req))
        } catch(e) {
            next(e);
        }
    })
    .delete(async (req, res, next) => {
        try {
            const taskId = req.params.taskId;
            res.send(await database.deleteTask({_id : taskId}))
        } catch(e) {
            next(e);
        }
    });

module.exports = task;
