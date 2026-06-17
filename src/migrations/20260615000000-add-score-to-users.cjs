'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Check if the column already exists in the database
      const tableInfo = await queryInterface.describeTable('users');
      
      if (!tableInfo.score) {
        await queryInterface.addColumn('users', 'score', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        });
      } else {
        console.log('Skipping: column "score" already exists in users table.');
      }
    } catch (error) {
      console.error('Migration failed checking/adding score column:', error);
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'score');
  },
};