# Use an official Node.js runtime as a parent image
FROM node:18-bullseye

# Set up arguments for user creation
ARG DOCKERUSER_UID=65000
ARG DOCKERUSER_GID=65000
ARG DOCKERUSER_NAME=dockeruser

# Create a non-root user
RUN groupadd --gid $DOCKERUSER_GID $DOCKERUSER_NAME \
    && useradd --uid $DOCKERUSER_UID --gid $DOCKERUSER_GID --create-home --shell /bin/bash $DOCKERUSER_NAME

# Set environment variables
ENV HOME=/home/$DOCKERUSER_NAME

# Install locales and basic utilities
RUN apt-get update && apt-get install -y locales sudo tree \
    && echo "$DOCKERUSER_NAME ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/$DOCKERUSER_NAME \
    && chmod 0440 /etc/sudoers.d/$DOCKERUSER_NAME \
    && sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen \
    && dpkg-reconfigure --frontend=noninteractive locales \
    && update-locale LC_ALL=en_US.UTF-8 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for locale
ENV LC_ALL=en_US.UTF-8
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US.UTF-8

# Set the working directory to the app-main directory
WORKDIR /usr/src/project/app-main

# add npm install next
RUN npm install next
# npm install -g firebase-tools
# npm install styled-components

# Copy the project files into the container
COPY --chown=$DOCKERUSER_NAME:$DOCKERUSER_NAME . .

# Switch to non-root user
USER $DOCKERUSER_NAME

# Expose the port Next.js runs on
EXPOSE 3000

# Command to start the Next.js application
CMD ["npm", "run", "dev"]
