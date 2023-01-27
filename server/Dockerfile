# Use an official Python runtime as the base image
FROM python:3.9.16

# Set the working directory in the container
WORKDIR /app

# Copy the requirements.txt file into the container
COPY requirements.txt .

# Install the dependencies
RUN pip install --upgrade pip
# this seems to be necessary because scikit misc requires numipy to be installed first
RUN pip install numpy

RUN pip install -r requirements.txt

# Copy the rest of the application files into the container
COPY . ./app

# Expose port 5000 for the development server
EXPOSE 5000

ENTRYPOINT ["python"]
CMD ["flask", "run"]
