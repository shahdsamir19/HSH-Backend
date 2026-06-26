'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('questions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      text: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      options: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      'correct_answer': {
        type: Sequelize.STRING,
        allowNull: false
      },
      clue: {
        type: Sequelize.STRING,
        allowNull: true
      },
      points: {
        type: Sequelize.INTEGER,
        defaultValue: 10
      },
      'game_mode': {
        type: Sequelize.STRING,
        allowNull: false
      },
      'author_id': {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      'created_at': {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      'updated_at': {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('questions');
  }
};
