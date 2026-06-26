'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const addColSafe = async (tableName, columnName, options) => {
      try {
        await queryInterface.addColumn(tableName, columnName, options);
      } catch (err) {
        if (!err.message.includes('already exists')) {
          throw err;
        }
      }
    };

    await addColSafe('users', 'xp', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    });
    await addColSafe('users', 'rank', {
      type: Sequelize.STRING,
      defaultValue: 'Cyber Rookie'
    });
    await addColSafe('users', 'wins', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    });
    await addColSafe('users', 'losses', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    });
    await addColSafe('users', 'status', {
      type: Sequelize.STRING,
      defaultValue: 'Offline'
    });
    await addColSafe('users', 'avatar', {
      type: Sequelize.STRING,
      defaultValue: '🛡️'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'xp');
    await queryInterface.removeColumn('users', 'rank');
    await queryInterface.removeColumn('users', 'wins');
    await queryInterface.removeColumn('users', 'losses');
    await queryInterface.removeColumn('users', 'status');
    await queryInterface.removeColumn('users', 'avatar');
  }
};
