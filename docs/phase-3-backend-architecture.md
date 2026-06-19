# Phase 3 — Backend Architecture

Framework:
NestJS

Architecture:
Modular Architecture

Pattern:
Repository Pattern

Layers:

Controller

↓

Service

↓

Repository

↓

Mongoose Model

↓

MongoDB

Rules

Controllers never access DB directly

Services contain business logic

Repository handles database access

Folder Structure

src/

core/
shared/
config/
infrastructure/
modules/