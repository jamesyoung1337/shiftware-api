/*
|--------------------------------------------------------------------------
| Preloaded File
|--------------------------------------------------------------------------
|
| Any code written inside this file will be executed during the application
| boot.
|
*/
import Event from '@ioc:Adonis/Core/Event'
import Logger from '@ioc:Adonis/Core/Logger'

Event.on('user:register', (user) => {
    Logger.debug(`User registered: ${JSON.stringify(user)}`)
})

Event.on('user:login', (user) => {
  Logger.debug(`User login: ${JSON.stringify(user)}`)
})
