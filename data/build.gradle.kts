plugins {
    id("android-library-convention")
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.example.knightlore.data"
}

dependencies {
    implementation(project(":domain"))
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    ksp(libs.room.compiler)
    implementation(libs.datastore.preferences)
    implementation(libs.kotlinx.serialization.json)
}
