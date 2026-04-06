plugins {
    id("android-library-convention")
}

android {
    namespace = "com.palacesoft.knightlore.debug"
}

dependencies {
    implementation(project(":core"))
    implementation(project(":domain"))
    implementation(project(":render"))
}
