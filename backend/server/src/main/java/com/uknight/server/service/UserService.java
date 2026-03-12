package com.uknight.server.service;

import com.uknight.server.model.User;
import com.uknight.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

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

    public Optional<User> getUserById(String id) {
        return userRepository.findById(id);
    }

    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public User updateUser(User user) {
        return userRepository.save(user);
    }

    public User verifyUser(String userId, Boolean verified, String schoolEmail) {
        return userRepository.findById(userId).map(user -> {
            if (verified != null) user.setVerified(verified);
            if (schoolEmail != null && !schoolEmail.isBlank()) user.setSchoolEmail(schoolEmail);
            log.info("Verifying user {}: verified={}, schoolEmail={}", userId, verified, schoolEmail);
            return userRepository.save(user);
        }).orElse(null);
    }

    public void incrementPeopleMet(String userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setNumPeopleMet((user.getNumPeopleMet() == null ? 0 : user.getNumPeopleMet()) + 1);
            userRepository.save(user);
            log.info("Incremented peopleMet for user {}: now {}", userId, user.getNumPeopleMet());
        });
    }

    public void addTimeSpent(String userId, long minutes) {
        if (minutes <= 0) return;
        userRepository.findById(userId).ifPresent(user -> {
            user.setTimeSpentMinutes((user.getTimeSpentMinutes() == null ? 0 : user.getTimeSpentMinutes()) + (int) minutes);
            userRepository.save(user);
            log.info("Added {}m to user {}: now {}m", minutes, userId, user.getTimeSpentMinutes());
        });
    }
}
