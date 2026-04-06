plugins {
    `kotlin-dsl`
}

dependencies {
    // These allow the convention plugins to apply AGP and Kotlin plugins
    // by name without versions (versions come from the classpath here)
    implementation("com.android.tools.build:gradle:8.7.0")
    implementation("org.jetbrains.kotlin:kotlin-gradle-plugin:2.1.0")
}
