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
    return database.updateTask(data);
}

function isValidStringDate(dateAsString) {
    const parsedDate = parseISO(dateAsString);
    if (isValid(parsedDate)) {
        return parsedDate;
    }
    throw "Invalid Date";
}

task.route('/query')
    .get(async (req, res, next) => {
        //username, startTime, endTime
        const data = {
            endDay: req.query.endDay,
            startDay: req.query.startDay,
            status: req.query.status,
            assigned: req.query.assigned,
            creator: req.query.creator,
            title: req.query.title,
            description: req.query.description
        }
        
        // indexed based on assigned, status, time
        const indexedQuery = {};
        indexedQuery[TASK_SCHEMA.ASSIGNED] = data.assigned || username;
        indexedQuery[TASK_SCHEMA.STATUS] = { 
            $in: data.status ? data.status.split(',').map(status => status.toUpperCase()) : Object.values(STATUS_ENUM)
        };
        try {
            if (data.startDay) {
                const startDay = isValidStringDate(data.startDay);
                indexedQuery[TASK_SCHEMA.DUE_DATE] = indexedQuery[TASK_SCHEMA.DUE_DATE] || {};
                indexedQuery[TASK_SCHEMA.DUE_DATE].$gte = startDay;
            }
            if (data.endDay) {
                const endDay = isValidStringDate(data.endDay);
                indexedQuery[TASK_SCHEMA.DUE_DATE] = indexedQuery[TASK_SCHEMA.DUE_DATE] || {};
                indexedQuery[TASK_SCHEMA.DUE_DATE].$lte = endDay;
            }

            if (data.creator) {
                indexedQuery[TASK_SCHEMA.CREATOR] = data.creator;
            }
            
            if (data.title) {
                indexedQuery[TASK_SCHEMA.TITLE] = {
                    $regex: data.title
                }
            }
            
            if (data.description) {
                indexedQuery[TASK_SCHEMA.DESCRIPTION] = {
                    $regex: data.description
                }
            }

            res.send(await database.queryTasks(indexedQuery));
        } catch (error) {
            if (error === 'Invalid Date') {
                next({
                    message: 'Please enter a valid ISO date (yyyy-mm-dd)',
                    status: 400
                });
            } 
            next(error);
        }
    });

task.route('/')
    .get(async (req, res, next) => {
        // get expiring tasks within the next 7 days
        let days = req.query.days || 7;
        try {
            endTime = addDays(endOfDay(new Date()), days);
            startTime = new Date();
            res.send(await database.getExpiringTasks(username, startTime, endTime));
        } catch (error) {
            next(error);
        }
        
    })
    .post(async (req, res, next) => {
        // set defaults
        req.body = req.body || {};
        req.body = Object.assign({
            [TASK_SCHEMA.CREATOR]: username,
            [TASK_SCHEMA.ASSIGNED]: username,
            [TASK_SCHEMA.STATUS]: STATUS_ENUM.NEW,
            [TASK_SCHEMA.DUE_DATE]: addDays(endOfDay(new Date()), 7),
            [TASK_SCHEMA.TITLE]: '',
            [TASK_SCHEMA.DESCRIPTION]: ''
        }, req.body);
        const result = await processPost(req).catch((e) => {
            next(e);
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
