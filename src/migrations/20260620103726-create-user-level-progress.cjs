'use strict';

/**
 * Creates the user_level_progress table.
 *
 * Column naming matches the project's global Sequelize config
 * (`define: { underscored: true }` in src/config/database.js), so
 * camelCase model attributes map to snake_case columns here:
 *   userId         -> user_id
 *   levelId        -> level_id
 *   highestScore   -> highest_score
 *   completionTime -> completion_time
 *   completedAt    -> completed_at
 *   createdAt      -> created_at
 *   updatedAt      -> updated_at
 *
 * users.id is a UUID (see src/models/user.model.js), so user_id here
 * must also be UUID, not INTEGER.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_level_progress', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      level_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      highest_score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      stars: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      grade: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'Fail',
      },
      attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM('passed', 'failed'),
        allowNull: false,
        defaultValue: 'failed',
      },
      completion_time: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Composite unique constraint: one progress row per user per level.
    await queryInterface.addIndex('user_level_progress', {
      fields: ['user_id', 'level_id'],
      unique: true,
      name: 'user_level_progress_user_id_level_id_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      'user_level_progress',
      'user_level_progress_user_id_level_id_unique'
    );
    await queryInterface.dropTable('user_level_progress');

    // Postgres leaves the ENUM type behind after dropTable; clean it up
    // so re-running the migration (up -> down -> up) doesn't collide
    // with "type already exists".
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_user_level_progress_status";'
    );
  },
};