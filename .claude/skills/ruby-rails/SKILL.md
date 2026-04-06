---
name: ruby-rails
description: Ruby on Rails framework patterns — ActiveRecord, controllers, concerns, service objects, background jobs, and API mode
layer: domain
category: backend
triggers:
  - "ruby"
  - "rails"
  - "activerecord"
  - "ruby on rails"
  - "rails api"
  - "sidekiq"
  - "rails migration"
inputs: [application requirements, Rails version, database choice]
outputs: [models, controllers, services, migrations, tests, configuration]
linksTo: [postgresql, redis, testing-patterns, cicd, docker]
linkedFrom: [api-designer, authentication]
preferredNextSkills: [postgresql, testing-patterns]
fallbackSkills: [api-designer]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: [database migrations, gem installations]
---

# Ruby on Rails

## Purpose

Rails is a full-stack MVC framework optimized for developer productivity with strong conventions. This skill covers modern Rails patterns (Rails 7+), API mode, ActiveRecord best practices, service objects, and background job processing.

## Key Patterns

### Model — ActiveRecord Best Practices

```ruby
class Order < ApplicationRecord
  # Associations
  belongs_to :customer
  has_many :order_items, dependent: :destroy
  has_many :products, through: :order_items
  has_one :shipment

  # Validations
  validates :status, presence: true, inclusion: { in: %w[pending confirmed shipped delivered] }
  validates :total_cents, numericality: { greater_than_or_equal_to: 0 }

  # Scopes — keep queries in the model, not controllers
  scope :recent, -> { where("created_at > ?", 30.days.ago) }
  scope :pending, -> { where(status: "pending") }
  scope :with_items, -> { includes(:order_items, :products) }

  # Enum for status
  enum :status, { pending: 0, confirmed: 1, shipped: 2, delivered: 3 }

  # Callbacks — use sparingly
  after_create :send_confirmation_email

  # Business logic belongs in the model or service objects
  def confirm!
    raise InvalidTransitionError unless pending?
    update!(status: :confirmed, confirmed_at: Time.current)
  end

  private

  def send_confirmation_email
    OrderMailer.confirmation(self).deliver_later
  end
end
```

### Controller — Thin Controllers

```ruby
class Api::V1::OrdersController < ApplicationController
  before_action :authenticate_user!
  before_action :set_order, only: %i[show update]

  def index
    orders = current_user.orders
      .recent
      .with_items
      .page(params[:page])
      .per(25)

    render json: OrderSerializer.new(orders).serializable_hash
  end

  def create
    result = Orders::CreateService.call(
      customer: current_user,
      items: order_params[:items]
    )

    if result.success?
      render json: OrderSerializer.new(result.order).serializable_hash, status: :created
    else
      render json: { errors: result.errors }, status: :unprocessable_entity
    end
  end

  private

  def set_order
    @order = current_user.orders.find(params[:id])
  end

  def order_params
    params.require(:order).permit(items: %i[product_id quantity])
  end
end
```

### Service Objects

```ruby
module Orders
  class CreateService
    attr_reader :order, :errors

    def self.call(**args)
      new(**args).call
    end

    def initialize(customer:, items:)
      @customer = customer
      @items = items
      @errors = []
    end

    def call
      ActiveRecord::Base.transaction do
        @order = @customer.orders.build(status: :pending)
        build_order_items
        calculate_total
        @order.save!
      end
      self
    rescue ActiveRecord::RecordInvalid => e
      @errors = e.record.errors.full_messages
      self
    end

    def success?
      @errors.empty?
    end

    private

    def build_order_items
      @items.each do |item|
        product = Product.find(item[:product_id])
        @order.order_items.build(
          product: product,
          quantity: item[:quantity],
          unit_price_cents: product.price_cents
        )
      end
    end

    def calculate_total
      @order.total_cents = @order.order_items.sum { |i| i.unit_price_cents * i.quantity }
    end
  end
end
```

### Background Jobs with Sidekiq

```ruby
class ProcessOrderJob < ApplicationJob
  queue_as :default
  retry_on ActiveRecord::Deadlocked, wait: 5.seconds, attempts: 3
  discard_on ActiveJob::DeserializationError

  def perform(order_id)
    order = Order.find(order_id)
    return if order.confirmed? # Idempotency guard

    order.confirm!
    InventoryService.reserve(order)
    PaymentService.charge(order)
  end
end

# Enqueue
ProcessOrderJob.perform_later(order.id)
# Schedule
ProcessOrderJob.set(wait: 5.minutes).perform_later(order.id)
```

### Migrations

```ruby
class CreateOrders < ActiveRecord::Migration[7.1]
  def change
    create_table :orders do |t|
      t.references :customer, null: false, foreign_key: { to_table: :users }
      t.integer :status, null: false, default: 0
      t.integer :total_cents, null: false, default: 0
      t.datetime :confirmed_at
      t.timestamps
    end

    add_index :orders, [:customer_id, :status]
    add_index :orders, :created_at
  end
end
```

## Common Pitfalls

1. **N+1 queries** — Always use `includes`, `preload`, or `eager_load`. Use the `bullet` gem in development to detect them.
2. **Fat controllers** — Move business logic to service objects or model methods. Controllers should only handle HTTP concerns.
3. **Callbacks for business logic** — Callbacks make testing hard and create hidden side effects. Use service objects instead.
4. **Not using database indexes** — Add indexes for all foreign keys and columns used in `WHERE` and `ORDER BY` clauses.
5. **Skipping strong parameters** — Always use `params.permit` to prevent mass assignment vulnerabilities.
6. **Blocking the web process** — Use background jobs (Sidekiq) for anything that takes more than 200ms.
