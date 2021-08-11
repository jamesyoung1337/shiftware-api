import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Users extends BaseSchema {
  protected tableName = 'users'

  public async up () {
    this.schema.table(this.tableName, (table) => {
      table.string('password_reset_token', 255)
    })
  }

  public async down () {
    this.schema.table(this.tableName, (table) => {
      table.dropColumn('password_reset_token')
    })
  }
}
