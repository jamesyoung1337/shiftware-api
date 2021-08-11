import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Users extends BaseSchema {
  protected tableName = 'users'

  public async up () {
    this.schema.table(this.tableName, (table) => {
      table.string('google2fa_secret', 255).nullable()
      table.boolean('enable_2fa').defaultTo(false)
    })
  }

  public async down () {
    this.schema.table(this.tableName, (table) => {
      table.dropColumn('google2fa_secret')
      table.dropColumn('enable_2fa')
    })
  }
}
