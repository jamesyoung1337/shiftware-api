import { DateTime } from 'luxon'
import Hash from '@ioc:Adonis/Core/Hash'
import {
  column,
  beforeSave,
  BaseModel,
  hasMany,
  HasMany,
  hasOne,
  HasOne,
  hasManyThrough,
  HasManyThrough
} from '@ioc:Adonis/Lucid/Orm'
import Client from './Client'
import Profile from './Profile'
import Shift from './Shift'
import Invoice from './Invoice'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public email: string

  @column()
  public name: string

  @column({ serializeAs: null })
  public password: string

  @column()
  public rememberMeToken?: string

  @column()
  public passwordResetToken?: string

  @column()
  public lastLoginAt?: DateTime

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @hasOne(() => Profile)
  public profile: HasOne<typeof Profile>

  @hasMany(() => Client)
  public clients: HasMany<typeof Client>

  @hasManyThrough([
    () => Shift,
    () => Client,
  ])
  public shifts: HasManyThrough<typeof Shift>

  @hasManyThrough([
    () => Invoice,
    () => Client,
  ])
  public invoices: HasManyThrough<typeof Invoice>

  @beforeSave()
  public static async hashPassword (user: User) {
    if (user.$dirty.password) {
      user.password = await Hash.make(user.password)
    }
  }
}
