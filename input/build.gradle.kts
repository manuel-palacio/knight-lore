plugins {
    id("android-library-convention")
}

android {
    namespace = "com.palacesoft.knightlore.input"
}

dependencies {
    implementation(project(":domain"))
}
