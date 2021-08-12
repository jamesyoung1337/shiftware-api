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
import Event from '@ioc:Adonis/Core/Event'
import Mail from '@ioc:Adonis/Addons/Mail'

import { schema, rules } from '@ioc:Adonis/Core/Validator'

import User from '../app/Models/User'
import Client from '../app/Models/Client'
import Profile from 'App/Models/Profile'
import Shift from 'App/Models/Shift'
import Invoice from 'App/Models/Invoice'

import moment from 'moment'
import { DateTime } from 'luxon'
import * as dotenv from 'dotenv'

import crypto from 'crypto'

const node2fa = require("node-2fa")

type ResetToken = {
    id: number,
    current_timestamp: number,
    password_hash: string,
    last_login_timestamp: number
}

const generatePasswordResetToken = (token: ResetToken) => {
    
    // None of this really matters much
    let _token = crypto.randomBytes(16)

    // let _token = token.id.toString()
    
    // _token += ';'
    // _token += token.current_timestamp.toString()
    // _token += ';'
    // _token += token.password_hash
    // _token += ';'
    // _token += token.last_login_timestamp.toString()

    return crypto.createHash('sha256').update(_token).digest('hex')
}

Route.group(() => {

    Route.post('/register', async ({ request, response }) => {
        const user = new User()
        user.name = request.input('name')
        user.email = request.input('email')
        user.password = request.input('password')
        
        try {
            await user.save()

            await Mail.send((message) => {
                message
                  .from('noreply@shiftware.digital')
                  .to(user.email)
                  .subject('Welcome Onboard!')
                  .htmlView('emails/welcome', { user })
            })
        }
        catch (e) {
            return response.badRequest({ message: `User with email ${request.input('email')} already exists` })
        }

        Event.emit('user:register', user)
        
        return response.created()
    })

    Route.post('/login', async ({ auth, request, response }) => {
        
        const email = request.input('email')
        const password = request.input('password')
        const google2fa_token = request.input('token') ?? null
    
        try {
          const token = await auth.use('api').attempt(email, password,
            { expiresIn: '24hours', name: 'MobileToken' })
          
            const user = await User.findBy('email', email)

            if (user?.enable_2fa && google2fa_token !== null) {
                // const newToken = twofactor.generateToken("XDQXYCP5AC6FA32FQXDGJSPBIDYNKK5W");
                // => { token: '630618' }
                // twofactor.verifyToken("XDQXYCP5AC6FA32FQXDGJSPBIDYNKK5W", "630618");
                // => { delta: 0 }
                const newToken = node2fa.generateToken(user.google2fa_secret)
                let result = node2fa.verifyToken(user.google2fa_secret, google2fa_token)
                if (result === null) {
                    // Token wrong?
                    await auth.use('api').revoke()
                    return response.unauthorized({ message: 'Incorrect 2fa token: please check your authenticator app' })
                }
            }

            // Note: Shouldn't happen, already attempted auth above and have
            // logged in user by email and password
            if (user !== null) {
                user.lastLoginAt = DateTime.now().setZone('Australia/Sydney')
                await user.save()
            }

            Event.emit('user:login', auth.user!)
            return token
        }
        catch {
          return response.unauthorized()
        }
    })

    Route.get('/reset-password', async({ auth, request, response }) => {
        // not logged in presumably, but can be: optional
        const qs = request.qs()
        if (Object.keys(qs).length !== 1 || !Object.keys(qs).includes('email')) {
            return response.badRequest({ message: 'Bad request for password reset'})
        }
        const user = await User.findBy('email', qs['email'])
        if (user === null) {
            return response.badRequest({ message: 'Bad request for password reset'})
        }
        let last_login = moment().unix()
        if (user.lastLoginAt) {
            // if lastLoginAt is set
            last_login = moment(user.lastLoginAt).unix()
        }
        const reset_token: ResetToken = { id: user.id, current_timestamp: last_login,
            password_hash: user.password, last_login_timestamp: last_login }
        console.log(reset_token)
        const token = generatePasswordResetToken(reset_token)
        user.passwordResetToken = token
        // password token has ;timestamp appended after sending mail,
        // which uses the token in its url
        await Mail.send((message) => {
            message
              .from('noreply@shiftware.digital')
              .to(user.email)
              .subject('Shiftware password reset')
              .htmlView('emails/reset_password', { user })
          })
        user.passwordResetToken += ';' + moment().unix().toString()
        await user.save()
        
        return { token: token }
    })

    Route.post('/reset-password/:token', async({ auth, request, params, response }) => {
        // not logged in presumably, but can be: optional
        // With token;timestamp this LIKE query seems to work well
        const users = await User.query().where('passwordResetToken', 'LIKE', params.token)
        if (users === null || users.length !== 1) {
            return response.badRequest({ message: 'Bad request for password reset'})
        }

        return { user: users[0] }
    }).where('token', /^[a-z0-9]{64}$/)

})
.prefix('/api/v1')

Route.group(() => {
    
    Route.get('/enable-2fa', async({ auth, request, response }) => {
        
        const user = auth.user!
        
        if (!user.enable_2fa) {
            user.enable_2fa = true
            const secret = node2fa.generateSecret({ name: "Shiftware", account: user.email })
            user.google2fa_secret = secret.secret
            await user.save()
            return { secret: secret }
        }
        
        // 2fa already enabled
        return {
            message: '2fa already enabled'
        }
    })

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
            {business: request.input('business') ?? null, abn: request.input('abn') ?? null,
            address: request.input('address') ?? null, suburb: request.input('suburb') ?? null,
            state: request.input('state') ?? null, postcode: request.input('postcode') ?? null,
            country: request.input('country') ?? null
        })
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

    Route.get('/clients/:id', async ({ auth, request, params, response }) => {
        const user = auth.user!
        const clients = await user.related('clients').query().where('id', params.id)
        return {
            client: clients[0]
        }
    }).where('id', /^[0-9]+$/)

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

    Route.get('/shifts/search', async ({ auth, request, response }) => {
        const user = auth.user!
        let shifts
        if (request.qs()) {
            let query = request.qs()
            if (Object.keys(query).length === 0) {
                return response.notFound({ message: 'No search parameters provided' })
            }
            for (let q of Object.keys(query)) {
                if (q === 'description') {
                    shifts = await user.related('shifts').query().where('description', 'LIKE', query[q])
                    break
                }
                if (q === 'client') {
                    shifts = await user.related('shifts').query().preload('client').where('name', 'LIKE', query[q]).orWhere('email', 'LIKE', '%' + query[q] + '%')
                    break
                }
                // escape/safe reflect q if necessary
                return response.badRequest({ message: `Invalid search parameter ${q}` })
            }
        }
        else {
            return response.notFound({ message: 'No search parameters provided' })
        }
        return {
            shifts: shifts
        }
    })

    Route.get('/shifts/:client', async ({ auth, request, params, response }) => {
        const user = auth.user!
        const shifts = await user.related('shifts').query().where('clientId', params.client)
        if (shifts.length === 0) {
            return response.notFound()
        }
        return {
            shifts: shifts
        }
    }).where('client', /^[0-9]+$/)

    Route.get('/shifts/:date', async ({ auth, request, params, response }) => {
        const user = auth.user!
        const shifts = await user.related('shifts').query().orderBy('shift_start')
        if (shifts === null || shifts.length == 0) {
            return response.notFound()
        }
        let filtered_shifts: Shift[] = []
        let day = moment(params.date)
        for (let shift of shifts) {
            const regexp = /(\d\d\d\d-\d\d-\d\d)T(\d\d:\d\d)/
            let start_date = moment(shift.shift_start).toISOString(false)
            let matches = start_date.toString().match(regexp) ?? []
            console.log(matches)
            let start = matches[1] + ' ' + matches[2]
            let shift_day = moment(start)
            // console.log(`Shift start date: ${shift_day}`)
            if (day.isSame(shift_day, 'day'))
                filtered_shifts.push(shift)
        }
        if (filtered_shifts.length == 0) {
            return response.notFound({ message: `Could not locate shift for ${params.date}` })
        }
        return {
            shifts: filtered_shifts
        }
    }).where('date', /^\d\d\d\d-\d\d-\d\d$/)

    Route.get('/shifts/:date/:client', async ({ auth, request, params, response }) => {
        const user = auth.user!
        const shifts = await user.related('shifts').query().where('clientId', params.client).orderBy('shift_start')
        if (shifts === null || shifts.length == 0) {
            return response.notFound()
        }
        let filtered_shifts: Shift[] = []
        let day = moment(params.date)
        for (let shift of shifts) {
            const regexp = /(\d\d\d\d-\d\d-\d\d)T(\d\d:\d\d)/
            let start_date = moment(shift.shift_start).toISOString(false)
            let matches = start_date.toString().match(regexp) ?? []
            console.log(matches)
            let start = matches[1] + ' ' + matches[2]
            let shift_day = moment(start)
            // console.log(`Shift start date: ${shift_date}`)
            if (day.isSame(shift_day, 'date'))
                filtered_shifts.push(shift)
        }
        if (filtered_shifts.length == 0) {
            return response.notFound({ message: `Could not locate shift for ${params.date}` })
        }
        return {
            shifts: filtered_shifts
        }
    }).where('date', /^\d\d\d\d-\d\d-\d\d$/).where('client', /^[0-9]+$/)

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
        if (invoices === null || invoices.length == 0) {
            return response.badRequest({ message: `Could not locate invoice #${params.id}` })
        }
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
    }).where('id', /^[0-9]+$/)

    Route.put('/invoices/:id', async ({ auth, request, params, response }) => {
        const user = auth.user!
        const invoice = await Invoice.find(params.id)
        if (invoice !== null) {
            invoice.paid = request.input('paid')
            await invoice.save()
            return response.created()
        }
        return response.badRequest({ message: 'Could not locate invoice' })
    }).where('id', /^[0-9]+$/)

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
