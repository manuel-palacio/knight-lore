plugins {
    id("android-library-convention")
}

android {
    namespace = "com.example.knightlore.input"
}

dependencies {
    implementation(project(":domain"))
}
