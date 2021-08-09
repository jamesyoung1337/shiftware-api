/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/

import Route from '@ioc:Adonis/Core/Route'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import User from 'app/Models/User'
import Client from 'app/Models/Client'

Route.group(() => {
    
})
.prefix('/api/v1')

Route.group(() => {
    
})
.middleware('auth:auth,api')
.prefix('/api/v1')
