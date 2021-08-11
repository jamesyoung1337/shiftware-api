import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Profiles extends BaseSchema {
  protected tableName = 'profiles'

  public async up () {
    this.schema.table(this.tableName, (table) => {
      table.string('mobile', 16)
      table.string('address', 255)
      table.string('suburb', 255)
      table.string('state', 64)
      table.string('postcode', 16)
      table.string('country', 16)
    })
  }

  public async down () {
    this.schema.table(this.tableName, (table) => {
      table.dropColumn('mobile')
      table.dropColumn('address')
      table.dropColumn('suburb')
      table.dropColumn('state')
      table.dropColumn('postcode')
      table.dropColumn('country')
    })
  }
}
