package com.uknight.server.service;

import com.uknight.server.model.User;
import com.uknight.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public User createUser(User user) {
        // Check if user already exists by ID first (Firebase UID)
        Optional<User> existingUserById = userRepository.findById(user.getUserId());
        if (existingUserById.isPresent()) {
            return existingUserById.get();
        }

        // Check by email as a fallback (though ID should be primary for Firebase)
        Optional<User> existingUserByEmail = userRepository.findByEmail(user.getEmail());
        if (existingUserByEmail.isPresent()) {
            // Update the existing user's ID if needed, or just return it
            // For now, let's just return it to be safe
            return existingUserByEmail.get();
        }

        log.info("Creating new user with email: {}", user.getEmail());
        // Set defaults if null
        if (user.getDisplayName() == null)
            user.setDisplayName("");
        if (user.getProfilePicture() == null)
            user.setProfilePicture("");
        if (user.getShowUsername() == null)
            user.setShowUsername(false);
        if (user.getVerified() == null)
            user.setVerified(false);
        if (user.getTimeSpentMinutes() == null)
            user.setTimeSpentMinutes(0);
        if (user.getNumPeopleMet() == null)
            user.setNumPeopleMet(0);

        return userRepository.save(user);
    }

    @Cacheable(value = "users", key = "#id", unless = "#result == null")
    public Optional<User> getUserById(String id) {
        return userRepository.findById(id);
    }

    @Cacheable(value = "users_email", key = "#email", unless = "#result == null")
    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Cacheable(value = "users_username", key = "#username", unless = "#result == null")
    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    @Transactional
    @CacheEvict(value = {"users", "users_email", "users_username"}, allEntries = true)
    public User updateUser(User user) {
        // Re-fetch from DB so the entity is managed, then merge changes
        // This ensures @ElementCollection (user_interests) is properly cleared and re-persisted
        return userRepository.findById(user.getUserId()).map(managed -> {
            managed.setDisplayName(user.getDisplayName());
            managed.setProfilePicture(user.getProfilePicture());
            managed.setUniversityName(user.getUniversityName());
            managed.setSchoolYear(user.getSchoolYear());
            managed.setShowUsername(user.getShowUsername());
            managed.setGender(user.getGender());
            managed.setUsername(user.getUsername());
            if (user.getPassword() != null && !user.getPassword().isEmpty()) {
                managed.setPassword(passwordEncoder.encode(user.getPassword()));
            }
            // Clear and replace interests so orphan rows in user_interests are deleted
            if (user.getInterests() != null) {
                managed.getInterests().clear();
                managed.getInterests().addAll(user.getInterests());
            }
            return userRepository.saveAndFlush(managed);
        }).orElse(userRepository.saveAndFlush(user));
    }

    @Transactional
    @CacheEvict(value = {"users", "users_email", "users_username"}, allEntries = true)
    public User verifyUser(String userId, Boolean verified, String schoolEmail) {
        return userRepository.findById(userId).map(user -> {
            if (verified != null) user.setVerified(verified);
            if (schoolEmail != null && !schoolEmail.isBlank()) user.setSchoolEmail(schoolEmail);
            log.info("Verifying user {}: verified={}, schoolEmail={}", userId, verified, schoolEmail);
            return userRepository.save(user);
        }).orElse(null);
    }

    @Transactional
    @CacheEvict(value = {"users", "users_email", "users_username"}, allEntries = true)
    public void incrementPeopleMet(String userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setNumPeopleMet((user.getNumPeopleMet() == null ? 0 : user.getNumPeopleMet()) + 1);
            userRepository.save(user);
            log.info("Incremented peopleMet for user {}: now {}", userId, user.getNumPeopleMet());
        });
    }

    @Transactional
    @CacheEvict(value = {"users", "users_email", "users_username"}, allEntries = true)
    public void addTimeSpent(String userId, long minutes) {
        if (minutes <= 0) return;
        userRepository.findById(userId).ifPresent(user -> {
            user.setTimeSpentMinutes((user.getTimeSpentMinutes() == null ? 0 : user.getTimeSpentMinutes()) + (int) minutes);
            userRepository.save(user);
            log.info("Added {}m to user {}: now {}m", minutes, userId, user.getTimeSpentMinutes());
        });
    }
}
