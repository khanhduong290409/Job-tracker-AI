package com.jobtrackerai.shared.ai;

public interface AiService {

    AiResponse generate(AiPrompt prompt);

    boolean isHealthy();
}
