plugins {
    id("desktop-convention")
}

dependencies {
    implementation(project(":core"))
    implementation(project(":domain"))
    implementation(project(":data"))
    implementation(compose.desktop.currentOs)
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-swing:1.9.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")

    testImplementation(project(":data"))
    testImplementation("org.junit.jupiter:junit-jupiter-api:5.11.3")
    testRuntimeOnly("org.junit.jupiter:junit-jupiter-engine:5.11.3")
}

compose.desktop {
    application {
        mainClass = "com.palacesoft.knightlore.desktop.MainKt"
    }
}

// Point assets to data/src/main/assets/ on the classpath
sourceSets {
    main {
        resources {
            srcDir("../data/src/main/assets")
        }
    }
}
