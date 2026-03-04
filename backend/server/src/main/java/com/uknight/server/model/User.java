package com.uknight.server.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.ZonedDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @Column(name = "user_id", length = 128)
    private String userId;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "display_name", length = 100)
    private String displayName;

    @Column(length = 20)
    private String gender;

    @Column(name = "school_year", length = 20)
    private String schoolYear;

    @Column(name = "school_email", unique = true)
    private String schoolEmail;

    @Column(columnDefinition = "boolean default false")
    private Boolean strike = false;

    @Column(name = "show_username", columnDefinition = "boolean default true")
    private Boolean showUsername = true;

    @Column(columnDefinition = "boolean default false")
    private Boolean verified = false;

    @Column(name = "time_spent_minutes", columnDefinition = "integer default 0")
    private Integer timeSpentMinutes = 0;

    @Column(name = "num_people_met", columnDefinition = "integer default 0")
    private Integer numPeopleMet = 0;

    @Column(name = "university_name", length = 150)
    private String universityName;

    @Column(name = "profile_picture", length = 500)
    private String profilePicture;

    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
    }
}
