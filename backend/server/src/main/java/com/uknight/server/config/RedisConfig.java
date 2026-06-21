package com.uknight.server.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.Map;

@Configuration
@EnableCaching
public class RedisConfig {

    /**
     * Shared ObjectMapper for Redis serialization.
     * - JavaTimeModule: supports java.time types (Instant, ZonedDateTime, etc.)
     * - activateDefaultTyping: embeds @class metadata so deserializing Object.class
     *   values produces the correct concrete type without a type hint.
     *
     * This ObjectMapper is intentionally separate from the Spring MVC one —
     * REST responses should NOT embed type metadata.
     */
    @Bean(name = "redisObjectMapper")
    public ObjectMapper redisObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.activateDefaultTyping(
            BasicPolymorphicTypeValidator.builder()
                .allowIfSubType(Object.class)
                .build(),
            ObjectMapper.DefaultTyping.NON_FINAL,
            JsonTypeInfo.As.PROPERTY
        );
        return mapper;
    }

    /**
     * Primary RedisTemplate for all manual Redis operations in the application.
     * Uses Jackson2JsonRedisSerializer with a custom ObjectMapper for JSON values.
     *
     * Note: Jackson2JsonRedisSerializer is deprecated in Spring Data Redis 4.x
     * (the framework is moving toward a new serialization contract), but it
     * remains functional and is the best available option that supports a
     * custom ObjectMapper with activateDefaultTyping. Suppressing the warning
     * intentionally until a stable replacement ships.
     */
    @Bean
    @SuppressWarnings("deprecation")
    public RedisTemplate<String, Object> redisTemplate(
            RedisConnectionFactory connectionFactory,
            ObjectMapper redisObjectMapper) {

        Jackson2JsonRedisSerializer<Object> json =
                new Jackson2JsonRedisSerializer<>(redisObjectMapper, Object.class);

        StringRedisSerializer str = new StringRedisSerializer();

        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(str);
        template.setHashKeySerializer(str);
        template.setValueSerializer(json);
        template.setHashValueSerializer(json);
        template.afterPropertiesSet();
        return template;
    }

    /**
     * Explicitly configured RedisCacheManager so each @Cacheable cache name
     * gets its own TTL instead of sharing a single global value.
     *
     * User profile data is fairly static — 5 minutes is a safe TTL that
     * meaningfully reduces database load on repeated profile lookups during
     * matchmaking interest comparison.
     */
    @Bean
    @SuppressWarnings("deprecation")
    public RedisCacheManager cacheManager(
            RedisConnectionFactory connectionFactory,
            ObjectMapper redisObjectMapper) {

        Jackson2JsonRedisSerializer<Object> json =
                new Jackson2JsonRedisSerializer<>(redisObjectMapper, Object.class);

        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(json))
                .disableCachingNullValues()
                .entryTtl(Duration.ofMinutes(5));

        // Per-cache TTL configuration
        Map<String, RedisCacheConfiguration> cacheConfigs = Map.of(
                "users",          defaultConfig.entryTtl(Duration.ofMinutes(5)),
                "users_email",    defaultConfig.entryTtl(Duration.ofMinutes(5)),
                "users_username", defaultConfig.entryTtl(Duration.ofMinutes(5))
        );

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .build();
    }
}
