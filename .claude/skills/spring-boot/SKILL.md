---
name: spring-boot
description: "Spring Boot patterns — auto-configuration, dependency injection, REST controllers, JPA, and actuator."
layer: domain
category: backend
triggers:
  - "spring boot"
  - "spring framework"
  - "spring jpa"
  - "spring security"
  - "spring actuator"
inputs:
  - "API endpoint requirements or domain model specifications"
  - "Performance or configuration issues with Spring Boot apps"
  - "JPA entity relationship design questions"
  - "Security configuration needs"
outputs:
  - "Spring Boot REST controllers with proper patterns"
  - "JPA entity mappings and repository queries"
  - "Security configuration with Spring Security"
  - "Production-ready application.yml configuration"
linksTo:
  - postgresql
  - redis
  - docker
  - kubernetes
linkedFrom: []
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Spring Boot Patterns & Best Practices

## Purpose

Provide expert guidance on Spring Boot application architecture, auto-configuration, REST API development, JPA/Hibernate patterns, and production-grade configuration. Covers Spring Boot 3.x with Jakarta EE, virtual threads, and GraalVM native image support.

## Key Patterns

### Project Structure

Follow the standard layered architecture:

```
src/main/java/com/example/app/
├── config/            # @Configuration classes
├── controller/        # @RestController endpoints
├── service/           # @Service business logic
├── repository/        # Spring Data JPA repositories
├── entity/            # JPA @Entity classes
├── dto/               # Request/response DTOs
├── exception/         # Custom exceptions + @ControllerAdvice
├── mapper/            # Entity ↔ DTO mappers (MapStruct)
└── Application.java   # @SpringBootApplication entry point
```

### REST Controllers

**Proper controller structure with validation and response entities:**

```java
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<Page<UserResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(userService.findAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.findById(id));
    }

    @PostMapping
    public ResponseEntity<UserResponse> create(@Valid @RequestBody CreateUserRequest request) {
        UserResponse created = userService.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(userService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        userService.delete(id);
    }
}
```

### JPA Entity Design

**Base entity with auditing:**

```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@Getter
public abstract class BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @CreatedDate
    @Column(updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    @Version
    private Long version; // Optimistic locking
}
```

**Entity with proper relationships:**

```java
@Entity
@Table(name = "orders", indexes = {
    @Index(name = "idx_orders_user_id", columnList = "user_id"),
    @Index(name = "idx_orders_status", columnList = "status")
})
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Order extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<OrderItem> items = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status = OrderStatus.DRAFT;

    // Domain method — encapsulate logic in the entity
    public void addItem(Product product, int quantity) {
        OrderItem item = new OrderItem(this, product, quantity, items.size());
        items.add(item);
    }

    public BigDecimal getTotal() {
        return items.stream()
                .map(OrderItem::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
```

### Repository Patterns

**Spring Data JPA repository with custom queries:**

```java
public interface OrderRepository extends JpaRepository<Order, UUID> {

    // Derived query
    List<Order> findByUserIdAndStatus(UUID userId, OrderStatus status);

    // JPQL with fetch join to avoid N+1
    @Query("SELECT o FROM Order o JOIN FETCH o.items WHERE o.id = :id")
    Optional<Order> findByIdWithItems(@Param("id") UUID id);

    // Native query for complex reporting
    @Query(value = """
        SELECT DATE_TRUNC('month', o.created_at) AS month,
               COUNT(*) AS order_count,
               SUM(oi.price * oi.quantity) AS revenue
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status = 'COMPLETED'
        GROUP BY month
        ORDER BY month DESC
        """, nativeQuery = true)
    List<MonthlyRevenueProjection> getMonthlyRevenue();

    // Specification for dynamic filtering
    Page<Order> findAll(Specification<Order> spec, Pageable pageable);
}
```

### Service Layer

**Transactional service with proper error handling:**

```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final OrderMapper orderMapper;
    private final ApplicationEventPublisher eventPublisher;

    public OrderResponse findById(UUID id) {
        Order order = orderRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", id));
        return orderMapper.toResponse(order);
    }

    @Transactional
    public OrderResponse create(UUID userId, CreateOrderRequest request) {
        User user = userRepository.getReferenceById(userId);
        Order order = orderMapper.toEntity(request);
        order.setUser(user);

        Order saved = orderRepository.save(order);
        eventPublisher.publishEvent(new OrderCreatedEvent(saved.getId()));

        return orderMapper.toResponse(saved);
    }

    @Transactional
    @Retryable(retryFor = OptimisticLockingFailureException.class, maxAttempts = 3)
    public OrderResponse updateStatus(UUID id, OrderStatus newStatus) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", id));
        order.setStatus(newStatus);
        return orderMapper.toResponse(orderRepository.save(order));
    }
}
```

### Global Exception Handling

```java
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(ResourceNotFoundException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND, ex.getMessage());
        detail.setTitle("Resource Not Found");
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(detail);
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ProblemDetail> handleConflict(OptimisticLockingFailureException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT, "Resource was modified by another request");
        detail.setTitle("Conflict");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(detail);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "Validation failed");
        detail.setProperty("errors", ex.getFieldErrors().stream()
                .map(fe -> Map.of("field", fe.getField(), "message", fe.getDefaultMessage()))
                .toList());
        return ResponseEntity.badRequest().body(detail);
    }
}
```

### Configuration

**application.yml with profiles:**

```yaml
spring:
  application:
    name: my-service
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:mydb}
    username: ${DB_USER:postgres}
    password: ${DB_PASS:postgres}
    hikari:
      maximum-pool-size: ${DB_POOL_SIZE:10}
      minimum-idle: 2
      connection-timeout: 5000
  jpa:
    open-in-view: false  # Always disable — prevents lazy loading in controllers
    hibernate:
      ddl-auto: validate  # Use Flyway/Liquibase for migrations
    properties:
      hibernate:
        default_batch_fetch_size: 16
        order_inserts: true
        order_updates: true
        jdbc.batch_size: 50
  threads:
    virtual:
      enabled: true  # Spring Boot 3.2+ virtual threads

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when-authorized

server:
  shutdown: graceful
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

### Spring Security Configuration

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.ignoringRequestMatchers("/api/**"))
                .sessionManagement(sm -> sm.sessionCreationPolicy(STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/products/**").permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
                .build();
    }

    @Bean
    public JwtDecoder jwtDecoder(@Value("${jwt.issuer-uri}") String issuerUri) {
        return JwtDecoders.fromIssuerLocation(issuerUri);
    }
}
```

## Best Practices

1. **Always disable `open-in-view`** — Prevents lazy-loading queries from firing inside controllers, which causes performance issues and breaks transactional boundaries.
2. **Use DTOs, not entities, in controllers** — Never expose JPA entities directly. Use records for request/response DTOs and MapStruct for mapping.
3. **Prefer constructor injection** — Use `@RequiredArgsConstructor` (Lombok) over `@Autowired` field injection for testability.
4. **Use `@Transactional(readOnly = true)` at class level** — Override with `@Transactional` only on write methods. This enables read-replica routing and Hibernate flush-mode optimization.
5. **Fetch joins for N+1 prevention** — Use `JOIN FETCH` in JPQL or `@EntityGraph` annotations to eagerly load associations when needed.
6. **Use Flyway or Liquibase for migrations** — Never rely on `ddl-auto` in production. Set it to `validate`.
7. **Enable virtual threads** (Spring Boot 3.2+) — For I/O-bound workloads, virtual threads eliminate the need for reactive programming in most cases.
8. **Use `ProblemDetail` for errors** — Spring 6 supports RFC 9457 Problem Details natively.
9. **Configure Hikari pool carefully** — `maximum-pool-size` should be `(2 * CPU cores) + disk_spindles` for most workloads.
10. **Enable batch inserts/updates** — Configure `hibernate.jdbc.batch_size` and `order_inserts/updates` for bulk operations.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| `open-in-view: true` (default) | Lazy loading in controller causes extra queries | Set `spring.jpa.open-in-view: false` |
| N+1 queries | Loading collections triggers per-entity queries | Use `JOIN FETCH` or `@EntityGraph` |
| Exposing entities in API | Tight coupling, circular refs, security leaks | Use DTO records + MapStruct |
| `ddl-auto: update` in prod | Schema drift, data loss risk | Use `validate` + Flyway migrations |
| Missing `@Version` | Lost updates under concurrency | Add optimistic locking with `@Version` |
| Blocking calls with WebFlux | Mixing blocking JPA with reactive stack | Use virtual threads instead of WebFlux for JPA apps |
| Large Hikari pool | Connection starvation at DB level | Size pool to `(2 * cores) + spindles` |
| No graceful shutdown | In-flight requests dropped on deploy | Configure `server.shutdown: graceful` |
