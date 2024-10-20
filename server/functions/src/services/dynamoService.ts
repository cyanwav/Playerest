import { dynamoDB } from "../config/awsConfig";

export const getAllUsers = async () => {
  const params = {
    TableName: "Users",
  };

  try {
    const data = await dynamoDB.scan(params).promise();
    return data.Items;
  } catch (error) {
    console.error("Error fetching users from DynamoDB:", error);
    throw new Error("Could not fetch users");
  }
};

export const getAllReviews = async () => {
  const params = {
    TableName: "Reviews",
  };

  try {
    const data = await dynamoDB.scan(params).promise();
    return data.Items;
  } catch (error) {
    console.error("Error fetching reviews from DynamoDB:", error);
    throw new Error("Could not fetch reviews");
  }
};

export const saveReview = async (username: string, reviewId: number) => {
  const params = {
    TableName: "Profiles",
    Key: {
      userName: String(username), // Ensure this matches the primary key for the Profiles table
    },
    UpdateExpression: "SET saved = list_append(if_not_exists(saved, :empty_list), :new_review_id)",
    ExpressionAttributeValues: {
      ":new_review_id": [reviewId], // New reviewId to add
      ":empty_list": [], // Default value if 'saved' doesn't exist
    },
    ReturnValues: "UPDATED_NEW", // Return the new value of 'saved'
  };

  try {
    const result = await dynamoDB.update(params).promise();
    console.log(`Review ID ${reviewId} added to user ${username}'s saved list.`);
    return result.Attributes?.saved || []; // Return the updated saved List
  } catch (error) {
    console.error("Error saving review:", error);
    throw new Error("Could not save the review.");
  }
};

export const getUserSavedReviews = async (username: string) => {
  const params = {
    TableName: "Profiles",
    Key: {
      userName: String(username), // Ensure this matches the primary key for the Profiles table
    },
    ProjectionExpression: "saved", // Specify that we only want the 'saved' attribute
  };
  try {
    const data = await dynamoDB.get(params).promise();
    if (!data.Item) {
      throw new Error(`User ${username} not found.`);
    }
    return data.Item.saved || [];
  } catch (error) {
    console.error("Error retrieving saved reviews:", error);
    throw new Error("Could not retrieve saved reviews.");
  }
};

export const fetchReviewsWithPagination = async (
  limit: number,
  lastEvaluatedKey?: any
) => {
  const params = {
    TableName: "Reviews",
    Limit: limit,
    ExclusiveStartKey: lastEvaluatedKey ? JSON.parse(lastEvaluatedKey) : null, // Parse the lastEvaluatedKey if provided
  };

  try {
    const data = await dynamoDB.scan(params).promise();

    return {
      reviews: data.Items || [],
      lastEvaluatedKey: data.LastEvaluatedKey || null,
    };
  } catch (error) {
    console.error("Error fetching reviews with pagination:", error); // Log the error
    throw new Error("Could not fetch reviews with pagination");
  }
};

export const deleteReview = async (id: number) => {
  const params = {
    TableName: "Reviews",
    Key: { id },
  };

  try {
    await dynamoDB.delete(params).promise();
    return {
      success: true,
      message: `Review with id ${id} deleted successfully`,
    };
  } catch (error) {
    console.error("Error deleting review:", error);
    throw new Error("Could not delete review");
  }
};


// Helper function to find the index of the reviewId in the saved list
const getReviewIndex = async (username: string, reviewId: number): Promise<number> => {
  const params = {
    TableName: "Profiles",
    Key: {
      userName: String(username), // Ensure this matches the primary key for the Profiles table
    },
    ProjectionExpression: "saved", // Specify that we only want the 'saved' attribute
  };

  const data = await dynamoDB.get(params).promise();
  const savedList = data.Item?.saved || [];

  const index = savedList.indexOf(reviewId);
  return index;
};

export const unsaveReview = async (username: string, reviewId: number) => {
  // First, find the index of the reviewId in the saved reviews list
  const index = await getReviewIndex(username, Number(reviewId));

  // Ensure the index is valid before proceeding with the update
  if (index === -1) {
    throw new Error("Review not found in the saved list.");
  }

  const params = {
    TableName: "Profiles",
    Key: {
      userName: String(username), // Ensure this matches the primary key for the Profiles table
    },
    UpdateExpression: `REMOVE #saved[${index}]`, // Correctly removing the item at the specified index
    ExpressionAttributeNames: {
      "#saved": "saved", // Reference the 'saved' list in the expression
    },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    await dynamoDB.update(params).promise();
    return {
      success: true,
      message: `Review with id ${reviewId} unsaved successfully`,
    };
  } catch (error) {
    console.error("Error unsaving review:", error);
    throw new Error("Could not unsave review");
  }
};

export const getReviewById = async (reviewId: number): Promise<any> => {
  try {
    const params = {
      TableName: "Reviews",
      Key: {
        id: reviewId, // Assuming 'id' is the primary key for the Reviews table
      },
    };

    const data = await dynamoDB.get(params).promise();

    // Return the item if found, or null if not found
    return data.Item || null;
  } catch (error) {
    console.error("Error fetching review by ID:", error);
    throw new Error("Could not fetch review by ID");
  }
};

export const getMaxReviewId = async (): Promise<number> => {
  const params = {
    TableName: "Reviews",
    ProjectionExpression: "id",
  };

  try {
    const data = await dynamoDB.scan(params).promise();

    if (!data.Items || data.Items.length === 0) {
      return 0;
    }

    const maxId = Math.max(...data.Items.map((item) => item.id));

    return maxId;
  } catch (error) {
    console.error("Error fetching max review id:", error);
    throw new Error("Could not fetch max review id");
  }
};

export const addReview = async (review: {
  imageUrl: string;
  author: string;
  title: string;
  content: string;
  rate: number;
}) => {
  const currentMaxId = await getMaxReviewId();
  const newReviewId = currentMaxId + 1;

  const params = {
    TableName: "Reviews",
    Item: {
      id: newReviewId,
      imageUrl: review.imageUrl,
      author: review.author,
      title: review.title,
      content: review.content,
      rate: review.rate,
      like: 0,
    },
  };

  try {
    await dynamoDB.put(params).promise();
    return {
      success: true,
      message: "Review added successfully!",
      id: newReviewId,
    };
  } catch (error) {
    console.error("Error adding review:", error);
    throw new Error("Could not add review");
  }
};

export const getReviewsByAuthor = async (
  author: string,
  reviewId?: number
): Promise<any[]> => {
  try {
    const params = {
      TableName: "Reviews",
      FilterExpression: "author = :author",
      ExpressionAttributeValues: {
        ":author": author,
      },
    };

    const data = await dynamoDB.scan(params).promise();

    const reviews = data.Items || [];
    if (reviewId) {
      return reviews.filter((review) => review.id !== reviewId);
    }

    return reviews;
  } catch (error) {
    console.error("Error fetching reviews by author:", error);
    throw new Error("Could not fetch reviews by author");
  }
};

export const checkUserExists = async (userId: string) => {
  const params = {
    TableName: "Users",
    Key: {
      UserId: userId,
    },
  };

  try {
    const data = await dynamoDB.get(params).promise();
    return !!data.Item;
  } catch (error) {
    console.error("Error checking if user exists:", error);
    throw new Error("Error checking if user exists");
  }
};

export const loginUser = async (userId: string, password: string) => {
  const params = {
    TableName: "Users",
    Key: {
      UserId: userId,
    },
  };

  try {
    const data = await dynamoDB.get(params).promise();

    if (data.Item && data.Item.Password === password) {
      return { success: true, message: "Login successful!" };
    } else {
      return { success: false, message: "Invalid UserId or Password" };
    }
  } catch (error) {
    console.error("Error logging in user:", error);
    throw new Error("Could not log in user");
  }
};

export const registerUser = async (userId: string, password: string) => {
  const userExists = await checkUserExists(userId);

  if (userExists) {
    return { success: false, message: "User already exists" };
  }

  const params = {
    TableName: "Users",
    Item: {
      UserId: userId,
      Password: password,
    },
  };

  try {
    await dynamoDB.put(params).promise();
    return { success: true, message: "User registered successfully!" };
  } catch (error) {
    console.error("Error registering user:", error);
    throw new Error("Could not register user");
  }
};

export const getAllComments = async () => {
  const params = {
    TableName: "Comments",
  };

  try {
    const data = await dynamoDB.scan(params).promise();
    return data.Items;
  } catch (error) {
    console.error("Error getting all comments:", error);
    throw new Error("Could not fetch comments");
  }
};

const getMaxCommentId = async (): Promise<number> => {
  const params = {
    TableName: "Comments",
    ProjectionExpression: "id",
  };

  try {
    const data = await dynamoDB.scan(params).promise();
    if (!data.Items || data.Items.length === 0) {
      return 0;
    }

    const maxId = Math.max(...data.Items.map((item) => item.id));
    return maxId;
  } catch (error) {
    console.error("Error fetching max comment id:", error);
    throw new Error("Could not fetch max comment id");
  }
};

export const addComment = async (comment: {
  author: string;
  content: string;
  reviewId: number;
}) => {
  const currentMaxId = await getMaxCommentId();
  const newCommentId = currentMaxId + 1;

  const params = {
    TableName: "Comments",
    Item: {
      id: newCommentId,
      author: comment.author,
      content: comment.content,
      reviewId: comment.reviewId,
      like: 0,
    },
  };

  try {
    await dynamoDB.put(params).promise();
    return {
      success: true,
      message: "Comment added successfully!",
      id: newCommentId,
    };
  } catch (error) {
    console.error("Error adding comment:", error);
    throw new Error("Could not add comment");
  }
};

export const getCommentsByReviewId = async (reviewId: number) => {
  const params = {
    TableName: "Comments",
    FilterExpression: "reviewId = :reviewId",
    ExpressionAttributeValues: {
      ":reviewId": reviewId,
    },
  };

  try {
    const data = await dynamoDB.scan(params).promise();
    return data.Items;
  } catch (error) {
    console.error(`Error getting comments for reviewId ${reviewId}:`, error);
    throw new Error("Could not fetch comments by reviewId");
  }
};

export const searchReviews = async (query: string): Promise<any[]> => {
  try {
    const params = {
      TableName: "Reviews",
    };

    const data = await dynamoDB.scan(params).promise();
    const reviews = data.Items || [];

    const lowerCaseQuery = query.toLowerCase();
    const filteredReviews = reviews.filter(
      (review) =>
        review.title.toLowerCase().includes(lowerCaseQuery) ||
        review.content.toLowerCase().includes(lowerCaseQuery) ||
        review.author.toLowerCase().includes(lowerCaseQuery)
    );

    return filteredReviews;
  } catch (error) {
    console.error("Error searching reviews:", error);
    throw new Error("Could not search reviews");
  }
};

export const getMaxDraftId = async (): Promise<number> => {
  const params = {
    TableName: "Drafts",
    ProjectionExpression: "id",
  };

  try {
    const data = await dynamoDB.scan(params).promise();
    if (!data.Items || data.Items.length === 0) {
      return 0;
    }

    const maxId = Math.max(...data.Items.map((item) => item.id));
    return maxId;
  } catch (error) {
    console.error("Error fetching max draft id:", error);
    throw new Error("Could not fetch max draft id");
  }
};

export const storeDraft = async (draft: {
  imageUrl: string;
  author: string;
  title: string;
  content: string;
  rate?: number;
}) => {
  const currentMaxId = await getMaxDraftId();
  const newDraftId = currentMaxId + 1;

  const params = {
    TableName: "Drafts",
    Item: {
      id: newDraftId,
      imageUrl: draft.imageUrl,
      author: draft.author,
      title: draft.title,
      content: draft.content,
      rate: draft.rate ?? null,
    },
  };

  try {
    await dynamoDB.put(params).promise();
    return {
      success: true,
      message: "Draft stored successfully!",
      id: newDraftId,
    };
  } catch (error) {
    console.error("Error storing draft:", error);
    throw new Error("Could not store draft");
  }
};

export const publishDraft = async (draftId: number) => {
  const getParams = {
    TableName: "Drafts",
    Key: { id: draftId },
  };

  try {
    const draftData = await dynamoDB.get(getParams).promise();

    if (!draftData.Item) {
      throw new Error(`Draft with id ${draftId} not found`);
    }

    const draft = draftData.Item;

    await addReview({
      imageUrl: draft.imageUrl,
      author: draft.author,
      title: draft.title,
      content: draft.content,
      rate: draft.rate,
    });

    const deleteParams = {
      TableName: "Drafts",
      Key: { id: draftId },
    };

    await dynamoDB.delete(deleteParams).promise();

    return { success: true, message: "Draft published successfully!" };
  } catch (error) {
    console.error("Error publishing draft:", error);
    throw new Error("Could not publish draft");
  }
};

export const getDraftsByUserName = async (userId: string) => {
  const params = {
    TableName: "Drafts",
    FilterExpression: "author = :author",
    ExpressionAttributeValues: {
      ":author": userId,
    },
  };

  try {
    const data = await dynamoDB.scan(params).promise();
    return data.Items || [];
  } catch (error) {
    console.error("Error fetching drafts by userId:", error);
    throw new Error("Could not fetch drafts by userId");
  }
};
