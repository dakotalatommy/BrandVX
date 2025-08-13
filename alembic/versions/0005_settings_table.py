from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table(
        'settings',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('tenant_id', sa.String(64), index=True),
        sa.Column('data_json', sa.Text(), nullable=False, server_default='{}'),
    )


def downgrade():
    op.drop_table('settings')


