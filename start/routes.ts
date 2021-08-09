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
import * as dotenv from 'dotenv'

Route.group(() => {

    Route.post('/register', async ({ request, response }) => {
        const user = new User()
        user.name = request.input('name')
        user.email = request.input('email')
        user.password = request.input('password')
        await user.save()
        return response.created()
    })

    Route.post('/login', async ({ auth, request, response }) => {
        
        const email = request.input('email')
        const password = request.input('password')

        // const loginSchema = ({
        //     email: schema.string({}, [
        //         rules.email()
        //     ]),
        //     password: schema.string({}, [
        //         rules.confirmed()
        //     ])
        // })

        // try {
        //     const payload = await request.validate({
        //       schema: loginSchema
        //     })
        // }
        // catch (error) {
        //     response.badRequest(error.messages)
        // }
    
        try {
          const token = await auth.use('api').attempt(email, password, { expiresIn: '24hours', name: 'MobileToken' })
          return token
        }
        catch {
          return response.unauthorized()
        }
    })
})
.prefix('/api/v1')

Route.group(() => {
    
    Route.get('/profile', async ({ auth, request, response }) => {
        return {
          user: auth.user
        }
    })

    Route.get('/logout', async ({ auth, response }) => {
        await auth.use('api').revoke()
        return {
            revoked: true
        }
    })
})
.middleware('auth:auth,api')
.prefix('/api/v1')
