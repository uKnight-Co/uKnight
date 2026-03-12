package com.uknight.server.controller;

import com.uknight.server.model.User;
import com.uknight.server.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody User user) {
        try {
            User createdUser = userService.createUser(user);
            return ResponseEntity.ok(createdUser);
        } catch (RuntimeException e) {
            log.error("Error creating user: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/verify")
    public ResponseEntity<User> verifyUser(@PathVariable String id, @RequestBody Map<String, Object> body) {
        try {
            Boolean verified = (Boolean) body.get("verified");
            String schoolEmail = (String) body.get("schoolEmail");
            User updatedUser = userService.verifyUser(id, verified, schoolEmail);
            if (updatedUser != null) {
                return ResponseEntity.ok(updatedUser);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error verifying user: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/login")
    public ResponseEntity<User> login(@RequestBody User user) {
        // This endpoint acts as a "get or create" for the user
        // The frontend sends the Firebase UID and email/metadata
        try {
            User loggedInUser = userService.createUser(user);
            return ResponseEntity.ok(loggedInUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable String id) {
        return userService.getUserById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable String id, @RequestBody User updatedFields) {
        try {
            return userService.getUserById(id)
                    .map(existing -> {
                        if (updatedFields.getDisplayName() != null)
                            existing.setDisplayName(updatedFields.getDisplayName());
                        if (updatedFields.getProfilePicture() != null)
                            existing.setProfilePicture(updatedFields.getProfilePicture());
                        if (updatedFields.getUniversityName() != null)
                            existing.setUniversityName(updatedFields.getUniversityName());
                        if (updatedFields.getSchoolYear() != null)
                            existing.setSchoolYear(updatedFields.getSchoolYear());
                        if (updatedFields.getShowUsername() != null)
                            existing.setShowUsername(updatedFields.getShowUsername());
                        if (updatedFields.getGender() != null)
                            existing.setGender(updatedFields.getGender());
                        if (updatedFields.getInterests() != null)
                            existing.setInterests(updatedFields.getInterests());
                        return ResponseEntity.ok(userService.updateUser(existing));
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Error updating user {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}
