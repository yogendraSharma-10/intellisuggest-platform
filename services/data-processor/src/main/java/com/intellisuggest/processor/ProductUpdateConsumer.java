```java
package com.intellisuggest.processor;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

/**
 * Consumes product update events from a Kafka topic.
 * This service is responsible for processing real-time changes to the product catalog,
 * such as creations, updates, and deletions. It ensures that downstream systems,
 * like databases, caches, and the recommendation engine's data model, are kept in sync.
 */
@Service
public class ProductUpdateConsumer {

    private static final Logger logger = LoggerFactory.getLogger(ProductUpdateConsumer.class);

    // In a real application, these would be injected services for interacting
    // with other parts of the infrastructure.
    // @Autowired
    // private ProductCatalogService productCatalogService;
    // @Autowired
    // private RecommendationDataService recommendationDataService;
    // @Autowired
    // private CacheService cacheService;

    /**
     * Listens to the configured Kafka topic for product update messages.
     * The `containerFactory` property points to a specific Spring bean that configures
     * the Kafka listener, including error handling (like retries and dead-letter queues)
     * and JSON deserialization.
     *
     * @param event The deserialized {@link ProductUpdateEvent} from the Kafka message payload.
     */
    @KafkaListener(
        topics = "${intellisuggest.kafka.topic.product-updates}",
        groupId = "${intellisuggest.kafka.group-id}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeProductUpdate(@Payload ProductUpdateEvent event) {
        logger.info("Received product update event for product ID: {}", event.productId());

        if (!isValidEvent(event)) {
            logger.warn("Invalid product update event received. Discarding: {}", event);
            // Invalid messages are logged and ignored. The container's error handler
            // would have already moved un-deserializable messages to a DLQ.
            return;
        }

        try {
            switch (event.eventType()) {
                case CREATE, UPDATE -> processProductUpsert(event);
                case DELETE -> processProductDelete(event);
                default -> logger.warn("Unsupported event type '{}' for product ID '{}'", event.eventType(), event.productId());
            }
        } catch (Exception e) {
            logger.error("Failed to process event for product ID '{}'. Error: {}", event.productId(), e.getMessage(), e);
            // Re-throwing the exception allows Spring Kafka's error handling mechanism
            // (e.g., a DefaultErrorHandler) to perform retries or send the message to a Dead-Letter Queue (DLQ).
            throw new RuntimeException("Processing failed for product update event: " + event, e);
        }
    }

    /**
     * Processes a product creation or update.
     * This involves updating the main data store, invalidating caches, and notifying
     * the recommendation engine that the item's features may have changed.
     *
     * @param event The event to process.
     */
    private void processProductUpsert(ProductUpdateEvent event) {
        logger.info("Processing UPSERT for product ID: {}", event.productId());

        // 1. Persist changes to the primary product database (e.g., PostgreSQL, MongoDB)
        // productCatalogService.saveOrUpdate(event.productDetails());
        logger.info("  -> [SIMULATED] Persisted product details for ID: {}", event.productId());

        // 2. Update the data store for the recommendation engine (e.g., a feature store or vector DB)
        // recommendationDataService.updateItemFeatures(event.productId(), event.productDetails());
        logger.info("  -> [SIMULATED] Updated recommendation engine data for ID: {}", event.productId());

        // 3. Invalidate relevant caches (e.g., Redis) to ensure fresh data is served
        // cacheService.evictProductCache(event.productId());
        logger.info("  -> [SIMULATED] Invalidated cache for product ID: {}", event.productId());

        logger.info("Successfully processed UPSERT for product ID: {}", event.productId());
    }

    /**
     * Processes a product deletion.
     * This involves removing the product from all relevant systems to prevent it from
     * being sold or recommended.
     *
     * @param event The event to process.
     */
    private void processProductDelete(ProductUpdateEvent event) {
        logger.info("Processing DELETE for product ID: {}", event.productId());

        // 1. Remove from the primary product database
        // productCatalogService.deleteById(event.productId());
        logger.info("  -> [SIMULATED] Deleted product from primary catalog for ID: {}", event.productId());

        // 2. Remove from the recommendation engine's data model
        // recommendationDataService.removeItem(event.productId());
        logger.info("  -> [SIMULATED] Removed item from recommendation engine data for ID: {}", event.productId());

        // 3. Invalidate caches
        // cacheService.evictProductCache(event.productId());
        logger.info("  -> [SIMULATED] Invalidated cache for product ID: {}", event.productId());

        logger.info("Successfully processed DELETE for product ID: {}", event.productId());
    }

    /**
     * Validates the integrity of the received event.
     *
     * @param event The event to validate.
     * @return true if the event is valid, false otherwise.
     */
    private boolean isValidEvent(ProductUpdateEvent event) {
        if (event == null || event.productId() == null || event.productId().isBlank() || event.eventType() == null) {
            return false;
        }
        // For CREATE/UPDATE events, the details payload must be present.
        if ((event.eventType() == EventType.CREATE || event.eventType() == EventType.UPDATE) && event.productDetails() == null) {
            return false;
        }
        return true;
    }

    // --- Data Transfer Objects (DTOs) ---

    /**
     * Defines the type of modification in a product event.
     */
    public enum EventType {
        CREATE,
        UPDATE,
        DELETE
    }

    /**
     * Represents the payload of a product update message from Kafka.
     * Using a Java Record for an immutable, concise data carrier.
     *
     * @param eventType      The type of the event (CREATE, UPDATE, DELETE).
     * @param productId      The unique identifier for the product.
     * @param productDetails The full details of the product. Can be null for DELETE events.
     */
    public record ProductUpdateEvent(
        @JsonProperty("eventType") EventType eventType,
        @JsonProperty("productId") String productId,
        @JsonProperty("productDetails") ProductDetails productDetails
    ) {}

    /**
     * Represents the detailed information of a product.
     *
     * @param name        The name of the product.
     * @param description A short description of the product.
     * @param category    The category the product belongs to.
     * @param price       The price of the product.
     * @param inStock     The stock availability status.
     */
    public record ProductDetails(
        @JsonProperty("name") String name,
        @JsonProperty("description") String description,
        @JsonProperty("category") String category,
        @JsonProperty("price") double price,
        @JsonProperty("inStock") boolean inStock
    ) {}
}
```