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

import User from '../app/Models/User'
import Client from '../app/Models/Client'
import Profile from 'App/Models/Profile'
import Shift from 'App/Models/Shift'
import Invoice from 'App/Models/Invoice'

import moment from 'moment'
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
    
        try {
          const token = await auth.use('api').attempt(email, password,
            { expiresIn: '24hours', name: 'MobileToken' })
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
        const user = auth.user!
        const profile = await Profile.findBy('userId', user.id)
        return {
            profile: profile
        }
    })

    Route.post('/profile', async ({ auth, request, response }) => {
        const user = auth.user!
        const profile = await Profile.firstOrCreate({ userId: user.id }, 
            {business: request.input('business'), abn: request.input('abn')})
        return {
            profile: profile
        }
    })

    Route.get('/clients', async ({ auth, request, response }) => {
        const user = auth.user!
        const clients = await user.related('clients').query()
        return {
            clients: clients
        }
    })

    Route.post('/clients', async ({ auth, request, response }) => {
        const user = auth.user!
        const client = new Client()
        client.name = request.input('name')
        client.email = request.input('email')
        await client.related('user').associate(user)
        await client.save()
        return {
            client: client
        }
    })

    Route.get('/shifts', async ({ auth, request, response }) => {
        const user = auth.user!
        const shifts = await user.related('shifts').query()
        return {
            shifts: shifts
        }
    })

    Route.post('/shifts', async ({ auth, request, response }) => {
        const user = auth.user!
        const clients = await user.related('clients').query().where('id', request.input('client_id'))
        const shift = new Shift()
        shift.description = request.input('description')
        shift.shift_start = request.input('start')
        shift.shift_end = request.input('end')
        shift.rate = request.input('rate')
        await shift.related('client').associate(clients[0])
        await shift.save()
        return {
            shift: shift
        }
    })

    Route.get('/invoices', async ({ auth, request, response }) => {
        const user = auth.user!
        const invoices = await user.related('invoices').query().preload('shifts')
        return {
            invoices: invoices
        }
    })

    Route.get('/invoices/:id', async ({ auth, request, params, response }) => {
        const user = auth.user!
        const invoices = await Invoice.query().where('id', params.id).preload('shifts')
        let subtotal = 0.0
        let gst = 0.0
        let total = 0.0
        for (const invoice of invoices) {
            // console.log(invoice)
            for (const shift of invoice['shifts']) {
                let end = moment(shift.shift_end)
                let start = moment(shift.shift_start)
                let d = moment.duration(end.diff(start))
                let rate = shift.rate
                let hours = d.asHours()
                subtotal += rate * hours
            }
        }
        total = subtotal * 1.10
        gst = total - subtotal
        // Create our number formatter.
        const formatter = new Intl.NumberFormat('en-US', {
            // style: '',
            // currency: 'AUD',
        
            // These options are needed to round to whole numbers if that's what you want.
            minimumFractionDigits: 2, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
            //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
        });
        return {
            invoice: invoices[0],
            subtotal: formatter.format(subtotal),
            gst: formatter.format(gst),
            total: formatter.format(total)
        }
    })

    Route.put('/invoices/:id', async ({ auth, request, params, response }) => {
        const user = auth.user!
        const invoice = await Invoice.find(params.id)
        invoice.paid = request.input('paid')
        await invoice.save()
        return response.created()
    })

    Route.post('/invoices', async ({ auth, request, response }) => {
        const user = auth.user!
        type ListOfIds = {
            id: number
        }
        const shift_ids: ListOfIds[] = request.input('shifts')   
        const clients = await user.related('clients').query().where('id', request.input('client_id'))
        const invoice = new Invoice()
        invoice.due = request.input('due')
        for (const shiftid of shift_ids) {
            const id = shiftid.id
            const shift = await clients[0].related('shifts').query().where('id', id)
            await shift[0].related('invoice').associate(invoice)
        }
        await invoice.related('client').associate(clients[0])
        await invoice.save()
        return {
            invoice: invoice
        }
    })

    Route.get('/logout', async ({ auth, response }) => {
        await auth.use('api').revoke()
        return {
            revoked: true
        }
    })
})
.middleware('api')
.prefix('/api/v1')
