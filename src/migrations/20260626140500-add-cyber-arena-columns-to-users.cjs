'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'xp', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    });
    await queryInterface.addColumn('users', 'rank', {
      type: Sequelize.STRING,
      defaultValue: 'Cyber Rookie'
    });
    await queryInterface.addColumn('users', 'wins', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    });
    await queryInterface.addColumn('users', 'losses', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    });
    await queryInterface.addColumn('users', 'status', {
      type: Sequelize.STRING,
      defaultValue: 'Offline'
    });
    await queryInterface.addColumn('users', 'avatar', {
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
